import { Router } from "express";
import {
  getDashboardStats,
  getAllUsers,
  getAllAuctionsAdmin,
  deleteUser,
  deleteAuction,
} from "../controllers/admin.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { verifyAdmin } from "../middlewares/admin.middleware.js";

const router = Router();

// Every route below requires a logged-in ADMIN (verifyJWT then the role gate).
router.use(verifyJWT, verifyAdmin);

router.route("/stats").get(getDashboardStats);
router.route("/users").get(getAllUsers);
router.route("/users/:id").delete(deleteUser);
router.route("/auctions").get(getAllAuctionsAdmin);
router.route("/auctions/:id").delete(deleteAuction);

export default router;
