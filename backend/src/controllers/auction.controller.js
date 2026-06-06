import mongoose from "mongoose";
import fs from "fs";
import { Auction } from "../models/auction.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import {
  AUCTION_CATEGORIES,
  AUCTION_STATUS,
  AUCTION_DURATIONS,
  MAX_AUCTION_DURATION_HOURS,
  MAX_PRICE,
  MAX_PAGE_LIMIT,
} from "../constants.js";

// Risk #5: escape user input so it is matched as a LITERAL string inside a regex.
// Without this, a search like `(a+)+$` becomes a real regex and can pin the CPU
// (ReDoS), and operators could be injected. This turns every char into a literal.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// POST /api/v1/auctions  — (protected) create an auction with an image
// Expects multipart/form-data: image (file) + title, description, category,
// startingPrice, and when it ends. The seller picks an explicit `endTime`
// (date + time). [startTime] is optional (defaults to now). For back-compat a
// `duration` preset ("1h"|"6h"|"24h") or "custom" + durationHours is still
// accepted when no endTime is provided.
const createAuction = asyncHandler(async (req, res) => {
  const localPath = req.file?.path;

  try {
    const {
      title,
      description,
      category,
      startingPrice,
      buyoutPrice,
      endTime,
      duration,
      durationHours,
      startTime,
    } = req.body;

    if (!localPath) {
      throw new ApiError(400, "Auction image is required");
    }
    if (
      [title, description, category, startingPrice].some(
        (f) => !f || String(f).trim() === ""
      )
    ) {
      throw new ApiError(
        400,
        "title, description, category and startingPrice are required"
      );
    }
    if (!AUCTION_CATEGORIES.includes(category)) {
      throw new ApiError(400, `category must be one of: ${AUCTION_CATEGORIES.join(", ")}`);
    }

    const price = Number(startingPrice);
    // Risk #4: isFinite rejects NaN/Infinity; the ceiling rejects absurd amounts.
    if (!Number.isFinite(price) || price < 0) {
      throw new ApiError(400, "startingPrice must be a non-negative number");
    }
    if (price > MAX_PRICE) {
      throw new ApiError(400, "startingPrice is unrealistically large");
    }

    // Optional buy-now price. If given, it must be a finite positive number,
    // within the ceiling, and STRICTLY ABOVE the starting price.
    let buyout = null;
    if (
      buyoutPrice !== undefined &&
      buyoutPrice !== null &&
      String(buyoutPrice).trim() !== ""
    ) {
      buyout = Number(buyoutPrice);
      if (!Number.isFinite(buyout) || buyout <= 0) {
        throw new ApiError(400, "buyoutPrice must be a positive number");
      }
      if (buyout > MAX_PRICE) {
        throw new ApiError(400, "buyoutPrice is unrealistically large");
      }
      if (buyout <= price) {
        throw new ApiError(400, "buyoutPrice must be greater than the starting price");
      }
    }

    const now = new Date();
    const start = startTime ? new Date(startTime) : now;
    if (Number.isNaN(start.getTime())) {
      throw new ApiError(400, "Invalid startTime");
    }
    // Allow a 1s clock-skew grace; otherwise reject past start times.
    if (start.getTime() < now.getTime() - 1000) {
      throw new ApiError(400, "startTime cannot be in the past");
    }

    // Resolve when the auction ends. Preferred: an explicit endTime the seller
    // chose on the date/time picker. Back-compat: a duration preset, or a
    // "custom" duration in hours, added onto the start time.
    let end;
    if (endTime) {
      end = new Date(endTime);
      if (Number.isNaN(end.getTime())) {
        throw new ApiError(400, "Invalid endTime");
      }
    } else if (duration === "custom") {
      const hrs = Number(durationHours);
      if (Number.isNaN(hrs) || hrs <= 0) {
        throw new ApiError(400, "Provide a valid durationHours for a custom duration");
      }
      end = new Date(start.getTime() + hrs * 60 * 60 * 1000);
    } else if (AUCTION_DURATIONS[duration]) {
      end = new Date(start.getTime() + AUCTION_DURATIONS[duration]);
    } else {
      throw new ApiError(400, "Please choose when the auction ends (endTime)");
    }

    // The end must come after the start, be in the future, and stay within the cap.
    if (end.getTime() <= start.getTime()) {
      throw new ApiError(400, "End time must be after the start time");
    }
    if (end.getTime() <= now.getTime()) {
      throw new ApiError(400, "End time must be in the future");
    }
    const maxEndMs = start.getTime() + MAX_AUCTION_DURATION_HOURS * 60 * 60 * 1000;
    if (end.getTime() > maxEndMs) {
      throw new ApiError(
        400,
        `Auction cannot run longer than ${MAX_AUCTION_DURATION_HOURS / 24} days`
      );
    }

    const status =
      start.getTime() <= now.getTime()
        ? AUCTION_STATUS.LIVE
        : AUCTION_STATUS.UPCOMING;

    // Push the image to Cloudinary (this also deletes the local temp file).
    const uploaded = await uploadOnCloudinary(localPath);
    if (!uploaded?.url) {
      throw new ApiError(500, "Failed to upload auction image");
    }

    const auction = await Auction.create({
      title,
      description,
      category,
      startingPrice: price, // currentPrice is set to this by the model's pre-save hook
      buyoutPrice: buyout, // null if the seller didn't set a buy-now price
      image: uploaded.url,
      seller: req.user._id,
      startTime: start,
      endTime: end,
      status,
    });

    return res
      .status(201)
      .json(new ApiResponse(201, auction, "Auction created successfully"));
  } catch (err) {
    // If we failed before Cloudinary cleaned up the temp file, remove it now.
    if (localPath && fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
    }
    throw err;
  }
});

// GET /api/v1/auctions  — (public) list with filter + search + pagination
// Query: page, limit, category, status, minPrice, maxPrice, search, sort
//   sort = endingSoon | priceLow | priceHigh | newest (default)
const getAllAuctions = asyncHandler(async (req, res) => {
  const { category, status, minPrice, maxPrice, search, sort } = req.query;

  // Risk #8: clamp pagination so nobody can request an enormous page.
  const pageNum = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limitNum = Math.min(
    Math.max(parseInt(req.query.limit, 10) || 12, 1),
    MAX_PAGE_LIMIT
  );

  const match = {};

  // Risk #5: only honour STRING filter values. Query parsing turns `?status[$ne]=x`
  // into an object, which would inject a Mongo operator — so we ignore non-strings.
  if (typeof status === "string" && status) {
    match.status = status;
  } else {
    match.status = { $in: [AUCTION_STATUS.LIVE, AUCTION_STATUS.UPCOMING] };
  }

  if (typeof category === "string" && category) match.category = category;

  const min = Number(minPrice);
  const max = Number(maxPrice);
  if (Number.isFinite(min) || Number.isFinite(max)) {
    match.currentPrice = {};
    if (Number.isFinite(min)) match.currentPrice.$gte = min;
    if (Number.isFinite(max)) match.currentPrice.$lte = max;
  }

  if (typeof search === "string" && search.trim()) {
    // escapeRegex => literal substring search (no injection, no ReDoS).
    match.title = { $regex: escapeRegex(search.trim()), $options: "i" };
  }

  let sortStage = { createdAt: -1 }; // newest first (default)
  if (sort === "endingSoon") sortStage = { endTime: 1 };
  else if (sort === "priceLow") sortStage = { currentPrice: 1 };
  else if (sort === "priceHigh") sortStage = { currentPrice: -1 };

  const pipeline = [
    { $match: match },
    { $sort: sortStage },
    {
      $lookup: {
        from: "users",
        localField: "seller",
        foreignField: "_id",
        as: "seller",
        pipeline: [{ $project: { username: 1 } }],
      },
    },
    { $addFields: { seller: { $first: "$seller" } } },
  ];

  const aggregate = Auction.aggregate(pipeline);
  const result = await Auction.aggregatePaginate(aggregate, {
    page: pageNum,
    limit: limitNum,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Auctions fetched successfully"));
});

// GET /api/v1/auctions/my  — (protected) the logged-in seller's own auctions
const getMyAuctions = asyncHandler(async (req, res) => {
  const auctions = await Auction.find({ seller: req.user._id })
    .sort({ createdAt: -1 })
    .populate("currentHighestBidder", "username");

  return res
    .status(200)
    .json(new ApiResponse(200, auctions, "Your auctions fetched successfully"));
});

// GET /api/v1/auctions/:id  — (public) single auction with seller/leader/winner
const getAuctionById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid auction id");
  }

  const auction = await Auction.findById(id)
    .populate("seller", "username")
    .populate("currentHighestBidder", "username")
    .populate("winner", "username");

  if (!auction) {
    throw new ApiError(404, "Auction not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, auction, "Auction fetched successfully"));
});

export { createAuction, getAllAuctions, getMyAuctions, getAuctionById };
