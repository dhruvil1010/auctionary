import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { Auction } from "../models/auction.model.js";
import { Bid } from "../models/bid.model.js";
import { AUCTION_STATUS } from "../constants.js";

// Cookie options.
//  - httpOnly  => not readable by client-side JS (mitigates XSS).
//  - secure    => HTTPS-only; off in dev so the cookie still sets over http://localhost.
//  - sameSite "strict" => Risk #6: the browser won't attach these cookies to requests
//    coming FROM another site, which blocks CSRF (a malicious page can't ride the
//    user's auth cookie). Our own SPA is same-site (localhost / same domain), and it
//    authenticates with a Bearer header anyway, so this costs us nothing.
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict",
};

/**
 * Generate a fresh access + refresh token for a user and persist the refresh
 * token on the user document. Shared by login and refresh.
 */
const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });

    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiError(500, "Failed to generate authentication tokens");
  }
};

// POST /api/v1/users/register  — create a new account
const registerUser = asyncHandler(async (req, res) => {
  const { username, email, password } = req.body;

  if ([username, email, password].some((f) => !f || String(f).trim() === "")) {
    throw new ApiError(400, "username, email and password are all required");
  }
  if (!email.includes("@")) {
    throw new ApiError(400, "Please provide a valid email address");
  }

  const existingUser = await User.findOne({
    $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }],
  });
  if (existingUser) {
    throw new ApiError(409, "A user with this email or username already exists");
  }

  // NOTE: role is deliberately NOT read from the body -> always defaults to "user",
  // so nobody can self-register as an admin.
  const user = await User.create({ username, email, password });

  // Re-fetch so password & refreshToken (select:false) are excluded from the response.
  const createdUser = await User.findById(user._id);
  if (!createdUser) {
    throw new ApiError(500, "Something went wrong while registering the user");
  }

  return res
    .status(201)
    .json(new ApiResponse(201, createdUser, "User registered successfully"));
});

// POST /api/v1/users/login  — authenticate and issue tokens
const loginUser = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;

  if (!password || (!email && !username)) {
    throw new ApiError(400, "Provide a password and either email or username");
  }

  // password is select:false in the schema, so explicitly include it here.
  const user = await User.findOne({
    $or: [{ email: email?.toLowerCase() }, { username: username?.toLowerCase() }],
  }).select("+password");

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  const isValid = await user.isPasswordCorrect(password);
  if (!isValid) {
    throw new ApiError(401, "Invalid credentials");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );
  const loggedInUser = await User.findById(user._id); // sanitized (no password/refreshToken)

  // Risk #3: the refresh token is sent ONLY as an httpOnly cookie — never in the
  // response body — so client-side JS (and any XSS) can't read this long-lived token.
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        { user: loggedInUser, accessToken },
        "Logged in successfully"
      )
    );
});

// POST /api/v1/users/logout  — (protected) clear the refresh token + invalidate tokens
const logoutUser = asyncHandler(async (req, res) => {
  // Risk #7: bump tokenVersion so the just-issued (stateless) access token stops
  // being accepted immediately — logout now truly ends the session. (This signs the
  // user out on all devices, which is the safer default.)
  await User.findByIdAndUpdate(req.user._id, {
    $unset: { refreshToken: 1 },
    $inc: { tokenVersion: 1 },
  });

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "Logged out successfully"));
});

// POST /api/v1/users/refresh-token  — exchange a valid refresh token for new tokens
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request — no refresh token");
  }

  let decoded;
  try {
    decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired refresh token");
  }

  const user = await User.findById(decoded._id).select("+refreshToken");
  if (!user || incomingRefreshToken !== user.refreshToken) {
    throw new ApiError(401, "Refresh token is expired or has already been used");
  }

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  // Risk #3: new refresh token goes back only via the httpOnly cookie, not the body.
  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { accessToken }, "Access token refreshed"));
});

// GET /api/v1/users/current-user  — (protected) return the logged-in user
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"));
});

// GET /api/v1/users/profile  — (protected) the logged-in user's profile:
// auctions they created, auctions they're actively bidding on, and ones they won.
const getUserProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // 1) Auctions this user created (they are the seller).
  const createdAuctions = await Auction.find({ seller: userId }).sort({
    createdAt: -1,
  });

  // 2) Auctions this user has won (winner is only set once an auction has ended).
  const wonAuctions = await Auction.find({ winner: userId })
    .sort({ updatedAt: -1 })
    .populate("seller", "username");

  // 3) "Active bids": auctions still LIVE that this user has bid on.
  //    Step A — the distinct auctions this user has ever bid on.
  const bidAuctionIds = await Bid.distinct("auction", { bidder: userId });
  //    Step B — keep only the ones still live (ending soonest first).
  const liveAuctions = await Auction.find({
    _id: { $in: bidAuctionIds },
    status: AUCTION_STATUS.LIVE,
  })
    .sort({ endTime: 1 })
    .populate("seller", "username");

  //    Step C — this user's highest bid per live auction (one grouped query).
  const myHighest = await Bid.aggregate([
    {
      $match: {
        bidder: userId,
        auction: { $in: liveAuctions.map((a) => a._id) },
      },
    },
    { $group: { _id: "$auction", yourHighestBid: { $max: "$amount" } } },
  ]);
  const yourHighestByAuction = new Map(
    myHighest.map((m) => [m._id.toString(), m.yourHighestBid])
  );

  //    Step D — annotate each auction with this user's standing.
  const activeBids = liveAuctions.map((auction) => ({
    auction,
    yourHighestBid: yourHighestByAuction.get(auction._id.toString()) ?? null,
    isHighestBidder:
      !!auction.currentHighestBidder &&
      auction.currentHighestBidder.toString() === userId.toString(),
  }));

  // 4) "Lost bids": auctions this user bid on that have ENDED with someone else as
  //    the winner. Same idea as activeBids, minus the "are you winning" flag, plus
  //    the winner's name for context.
  const lostAuctions = await Auction.find({
    _id: { $in: bidAuctionIds },
    status: AUCTION_STATUS.ENDED,
    winner: { $ne: userId },
  })
    .sort({ updatedAt: -1 })
    .populate("seller", "username")
    .populate("winner", "username");

  //    This user's highest bid per lost auction (one grouped query, as above).
  const myHighestLost = await Bid.aggregate([
    {
      $match: {
        bidder: userId,
        auction: { $in: lostAuctions.map((a) => a._id) },
      },
    },
    { $group: { _id: "$auction", yourHighestBid: { $max: "$amount" } } },
  ]);
  const yourHighestLostByAuction = new Map(
    myHighestLost.map((m) => [m._id.toString(), m.yourHighestBid])
  );

  const lostBids = lostAuctions.map((auction) => ({
    auction,
    yourHighestBid: yourHighestLostByAuction.get(auction._id.toString()) ?? null,
  }));

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        user: {
          _id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          role: req.user.role,
        },
        stats: {
          created: createdAuctions.length,
          activeBids: activeBids.length,
          won: wonAuctions.length,
          lost: lostBids.length,
        },
        createdAuctions,
        activeBids,
        wonAuctions,
        lostBids,
      },
      "Profile fetched successfully"
    )
  );
});

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  getUserProfile,
};
