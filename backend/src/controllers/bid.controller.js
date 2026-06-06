import mongoose from "mongoose";
import { Auction } from "../models/auction.model.js";
import { Bid } from "../models/bid.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  MIN_BID_INCREMENT_PERCENT,
  AUCTION_STATUS,
  MAX_PRICE,
  MAX_PAGE_LIMIT,
} from "../constants.js";
import {
  emitNewBid,
  emitOutbid,
  emitAuctionEnded,
  emitWon,
} from "../sockets/auction.socket.js";

// The minimum a bid must reach right now, given the auction's current state.
// First bid: >= startingPrice. Later bids: >= currentPrice + MIN_BID_INCREMENT_PERCENT%.
const computeMinimumBid = (auction) => {
  if (auction.bidCount === 0) return auction.startingPrice;
  return Math.ceil(auction.currentPrice * (1 + MIN_BID_INCREMENT_PERCENT / 100));
};

// POST /api/v1/bids  — (protected) place a bid on an auction
const placeBid = asyncHandler(async (req, res) => {
  const { auctionId, amount } = req.body;
  const numericAmount = Number(amount);

  if (!mongoose.isValidObjectId(auctionId)) {
    throw new ApiError(400, "Invalid auction id");
  }
  // Risk #4: isFinite rejects NaN AND Infinity (e.g. JSON `1e400` parses to Infinity);
  // the ceiling rejects absurd-but-finite amounts that would lock the auction.
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new ApiError(400, "Bid amount must be a positive number");
  }
  if (numericAmount > MAX_PRICE) {
    throw new ApiError(400, "Bid amount is unrealistically large");
  }

  const auction = await Auction.findById(auctionId);
  if (!auction) {
    throw new ApiError(404, "Auction not found");
  }

  // Auction must be live and not past its end time.
  if (auction.status !== AUCTION_STATUS.LIVE || auction.endTime <= new Date()) {
    throw new ApiError(400, "This auction is not accepting bids");
  }

  // A seller cannot bid on their own auction.
  if (auction.seller.toString() === req.user._id.toString()) {
    throw new ApiError(403, "You cannot bid on your own auction");
  }

  // Can't bid when you are already the highest bidder.
  if (
    auction.currentHighestBidder &&
    auction.currentHighestBidder.toString() === req.user._id.toString()
  ) {
    throw new ApiError(409, "You are already the highest bidder");
  }

  // Enforce the minimum (first bid >= startingPrice, otherwise +5% floor).
  const minimumBid = computeMinimumBid(auction);
  if (numericAmount < minimumBid) {
    throw new ApiError(400, `Your bid must be at least ${minimumBid}`);
  }

  // ---- The atomic, race-condition-safe update ----
  // Succeeds ONLY if the auction is still live, not expired, AND the stored
  // currentPrice is still strictly less than this bid. If two bids arrive at the
  // same instant, MongoDB applies this atomically — only one passes the
  // `currentPrice < amount` guard; the other gets null back and is rejected.
  // Returns the PRE-update document so we know the previous highest bidder.
  const previous = await Auction.findOneAndUpdate(
    {
      _id: auctionId,
      status: AUCTION_STATUS.LIVE,
      endTime: { $gt: new Date() },
      currentPrice: { $lt: numericAmount },
    },
    {
      $set: {
        currentPrice: numericAmount,
        currentHighestBidder: req.user._id,
      },
      $inc: { bidCount: 1 },
    }
  );

  if (!previous) {
    // Lost the race (someone bid >= this amount first) or the auction just closed.
    throw new ApiError(
      409,
      "Your bid was outpaced — the current price changed. Please refresh and try again."
    );
  }

  // Record the bid in history.
  const bid = await Bid.create({
    auction: auctionId,
    bidder: req.user._id,
    amount: numericAmount,
  });

  const newBidCount = previous.bidCount + 1;
  const previousLeaderId = previous.currentHighestBidder; // may be null on first bid

  // ---- Real-time fan-out ----
  const io = req.app.get("io");
  if (io) {
    // Everyone watching this auction sees the new bid live.
    emitNewBid(io, auctionId, {
      auctionId,
      bidId: bid._id,
      amount: numericAmount,
      currentPrice: numericAmount,
      bidCount: newBidCount,
      bidder: { _id: req.user._id, username: req.user.username },
      createdAt: bid.createdAt,
    });

    // Whoever was previously winning gets a personal "outbid" notification.
    if (
      previousLeaderId &&
      previousLeaderId.toString() !== req.user._id.toString()
    ) {
      emitOutbid(io, previousLeaderId, {
        auctionId,
        title: auction.title,
        newAmount: numericAmount,
        by: req.user.username,
      });
    }
  }

  return res
    .status(201)
    .json(
      new ApiResponse(
        201,
        { bid, currentPrice: numericAmount, bidCount: newBidCount },
        "Bid placed successfully"
      )
    );
});

// POST /api/v1/bids/buyout  — (protected) buy the item immediately at the
// seller's buy-now price. This ends the auction at once and makes the buyer the winner.
const buyNow = asyncHandler(async (req, res) => {
  const { auctionId } = req.body;

  if (!mongoose.isValidObjectId(auctionId)) {
    throw new ApiError(400, "Invalid auction id");
  }

  const auction = await Auction.findById(auctionId);
  if (!auction) {
    throw new ApiError(404, "Auction not found");
  }
  if (auction.buyoutPrice == null) {
    throw new ApiError(400, "This auction does not have a buy-now price");
  }
  if (auction.status !== AUCTION_STATUS.LIVE || auction.endTime <= new Date()) {
    throw new ApiError(400, "This auction is not accepting purchases");
  }
  if (auction.seller.toString() === req.user._id.toString()) {
    throw new ApiError(403, "You cannot buy your own auction");
  }
  // If bidding already reached/passed the buy-now price, the option is gone.
  if (auction.currentPrice >= auction.buyoutPrice) {
    throw new ApiError(409, "Bidding has already reached the buy-now price");
  }

  const buyoutPrice = auction.buyoutPrice;

  // Atomic + race-safe: only succeed if the auction is still live, not expired, and
  // the current price is still below the buy-now price (no one bid up to it first).
  // This both prevents double-close and returns the PRE-update doc (previous leader).
  const previous = await Auction.findOneAndUpdate(
    {
      _id: auctionId,
      status: AUCTION_STATUS.LIVE,
      endTime: { $gt: new Date() },
      currentPrice: { $lt: buyoutPrice },
    },
    {
      $set: {
        currentPrice: buyoutPrice,
        currentHighestBidder: req.user._id,
        winner: req.user._id,
        status: AUCTION_STATUS.ENDED,
      },
      $inc: { bidCount: 1 },
    }
  );

  if (!previous) {
    throw new ApiError(
      409,
      "This auction just closed or its price changed. Please refresh and try again."
    );
  }

  // Record the buy-now as a winning bid in history.
  const bid = await Bid.create({
    auction: auctionId,
    bidder: req.user._id,
    amount: buyoutPrice,
  });

  const newBidCount = previous.bidCount + 1;
  const previousLeaderId = previous.currentHighestBidder; // may be null

  // ---- Real-time fan-out ----
  const io = req.app.get("io");
  if (io) {
    const buyer = { _id: req.user._id, username: req.user.username };

    // Show the winning purchase in the live bid feed.
    emitNewBid(io, auctionId, {
      auctionId,
      bidId: bid._id,
      amount: buyoutPrice,
      currentPrice: buyoutPrice,
      bidCount: newBidCount,
      bidder: buyer,
      createdAt: bid.createdAt,
    });

    // The previous leader (if any, and not the buyer) was beaten by the buy-now.
    if (
      previousLeaderId &&
      previousLeaderId.toString() !== req.user._id.toString()
    ) {
      emitOutbid(io, previousLeaderId, {
        auctionId,
        title: auction.title,
        newAmount: buyoutPrice,
        by: req.user.username,
      });
    }

    // The auction is over — tell the room (winner banner) and the buyer personally.
    emitAuctionEnded(io, auctionId, {
      auctionId,
      title: auction.title,
      finalPrice: buyoutPrice,
      winner: buyer,
    });
    emitWon(io, req.user._id, {
      auctionId,
      title: auction.title,
      finalPrice: buyoutPrice,
    });
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        bid,
        currentPrice: buyoutPrice,
        bidCount: newBidCount,
        status: AUCTION_STATUS.ENDED,
      },
      "Purchase successful — you won the auction"
    )
  );
});

// GET /api/v1/bids/:auctionId  — (public) paginated bid history, newest first
const getAuctionBids = asyncHandler(async (req, res) => {
  const { auctionId } = req.params;

  // Risk #8: clamp pagination so a caller can't request a giant page.
  const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitNum = Math.min(
    Math.max(parseInt(req.query.limit, 10) || 20, 1),
    MAX_PAGE_LIMIT
  );

  if (!mongoose.isValidObjectId(auctionId)) {
    throw new ApiError(400, "Invalid auction id");
  }

  const aggregate = Bid.aggregate([
    { $match: { auction: new mongoose.Types.ObjectId(auctionId) } },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "bidder",
        foreignField: "_id",
        as: "bidder",
        pipeline: [{ $project: { username: 1 } }],
      },
    },
    { $addFields: { bidder: { $first: "$bidder" } } },
  ]);

  const result = await Bid.aggregatePaginate(aggregate, {
    page: pageNum,
    limit: limitNum,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Bid history fetched successfully"));
});

export { placeBid, buyNow, getAuctionBids };
