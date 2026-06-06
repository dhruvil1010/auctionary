import { ApiError } from "../utils/ApiError.js";

/**
 * verifyAdmin — role gate for admin-only routes.
 *
 * Must run AFTER verifyJWT (which sets req.user). Lets only `admin` accounts
 * through; everyone else gets a 403. We forward the error via next() so the
 * central error handler formats it consistently.
 */
export const verifyAdmin = (req, _res, next) => {
  if (!req.user || req.user.role !== "admin") {
    return next(new ApiError(403, "Admin access required"));
  }
  next();
};
