import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

/**
 * verifyJWT — route gatekeeper for protected endpoints.
 *
 * Reads the access token from the httpOnly cookie OR the
 * "Authorization: Bearer <token>" header, verifies its signature, loads the
 * matching user, and attaches it as `req.user` so downstream controllers know
 * who is making the request. Throws 401 if anything is missing or invalid.
 */
export const verifyJWT = asyncHandler(async (req, _res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request — no token provided");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (error) {
    throw new ApiError(401, "Invalid or expired access token");
  }

  // password & refreshToken are select:false, so they're already excluded.
  const user = await User.findById(decoded._id).select("-password -refreshToken");
  if (!user) {
    throw new ApiError(401, "Invalid access token — user no longer exists");
  }

  // Risk #7: reject tokens issued before the last logout (tokenVersion was bumped).
  if (Number(decoded.tokenVersion ?? 0) !== user.tokenVersion) {
    throw new ApiError(401, "Session ended — please log in again");
  }

  req.user = user;
  next();
});
