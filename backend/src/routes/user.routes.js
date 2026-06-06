import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  getUserProfile,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authLimiter } from "../middlewares/rateLimit.middleware.js";

const router = Router();

// ---- public routes ----
// authLimiter throttles brute-force / signup spam (Risk #2).
router.route("/register").post(authLimiter, registerUser);
router.route("/login").post(authLimiter, loginUser);
router.route("/refresh-token").post(authLimiter, refreshAccessToken);

// ---- protected routes (require a valid access token via verifyJWT) ----
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/current-user").get(verifyJWT, getCurrentUser);
router.route("/profile").get(verifyJWT, getUserProfile);

export default router;
