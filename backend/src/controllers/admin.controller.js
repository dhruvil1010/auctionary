import mongoose from "mongoose";
import { User } from "../models/user.model.js";
import { Auction } from "../models/auction.model.js";
import { Bid } from "../models/bid.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { AUCTION_STATUS, MAX_PAGE_LIMIT } from "../constants.js";

// GET /api/v1/admin/stats  — dashboard numbers (run in parallel)
const getDashboardStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalAuctions, totalBids, liveAuctions, endedAuctions] =
    await Promise.all([
      User.countDocuments(),
      Auction.countDocuments(),
      Bid.countDocuments(),
      Auction.countDocuments({ status: AUCTION_STATUS.LIVE }),
      Auction.countDocuments({ status: AUCTION_STATUS.ENDED }),
    ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      { totalUsers, totalAuctions, totalBids, liveAuctions, endedAuctions },
      "Dashboard stats fetched successfully"
    )
  );
});

// GET /api/v1/admin/users  — list all users (paginated)
const getAllUsers = asyncHandler(async (req, res) => {
  const pageNum = Math.max(Number(req.query.page) || 1, 1);
  // Risk #8: clamp so the page size can't be made enormous.
  const limitNum = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_PAGE_LIMIT);
  const skip = (pageNum - 1) * limitNum;

  const [users, total] = await Promise.all([
    // password & refreshToken are select:false -> never included in the response
    User.find().sort({ createdAt: -1 }).skip(skip).limit(limitNum),
    User.countDocuments(),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        users,
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      "Users fetched successfully"
    )
  );
});

// GET /api/v1/admin/auctions  — list ALL auctions, any status (paginated)
const getAllAuctionsAdmin = asyncHandler(async (req, res) => {
  const pageNum = Math.max(Number(req.query.page) || 1, 1);
  // Risk #8: clamp so the page size can't be made enormous.
  const limitNum = Math.min(Math.max(Number(req.query.limit) || 20, 1), MAX_PAGE_LIMIT);

  const aggregate = Auction.aggregate([
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: "users",
        localField: "seller",
        foreignField: "_id",
        as: "seller",
        pipeline: [{ $project: { username: 1, email: 1 } }],
      },
    },
    { $addFields: { seller: { $first: "$seller" } } },
  ]);

  const result = await Auction.aggregatePaginate(aggregate, {
    page: pageNum,
    limit: limitNum,
  });

  return res
    .status(200)
    .json(new ApiResponse(200, result, "Auctions fetched successfully"));
});

// DELETE /api/v1/admin/users/:id  — delete a user + cascade-clean their data
const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid user id");
  }

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.role === "admin") {
    throw new ApiError(403, "Admins cannot be deleted");
  }

  // MongoDB has no foreign keys, so we remove related documents ourselves:
  //  - the auctions this user created,
  //  - all bids on those auctions, plus this user's bids on any other auction.
  const theirAuctions = await Auction.find({ seller: id }).select("_id");
  const auctionIds = theirAuctions.map((a) => a._id);

  await Bid.deleteMany({
    $or: [{ auction: { $in: auctionIds } }, { bidder: id }],
  });
  await Auction.deleteMany({ seller: id });
  await User.findByIdAndDelete(id);

  return res.status(200).json(
    new ApiResponse(
      200,
      { deletedUserId: id, deletedAuctions: auctionIds.length },
      "User and related data deleted successfully"
    )
  );
});

// DELETE /api/v1/admin/auctions/:id  — delete an auction + its bids
const deleteAuction = asyncHandler(async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) {
    throw new ApiError(400, "Invalid auction id");
  }

  const auction = await Auction.findById(id);
  if (!auction) {
    throw new ApiError(404, "Auction not found");
  }

  await Bid.deleteMany({ auction: id });
  await Auction.findByIdAndDelete(id);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { deletedAuctionId: id },
        "Auction and its bids deleted successfully"
      )
    );
});

export {
  getDashboardStats,
  getAllUsers,
  getAllAuctionsAdmin,
  deleteUser,
  deleteAuction,
};
