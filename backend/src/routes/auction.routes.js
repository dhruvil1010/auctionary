import { Router } from "express";
import {
  createAuction,
  getAllAuctions,
  getMyAuctions,
  getAuctionById,
} from "../controllers/auction.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// public: list/browse auctions
router.route("/").get(getAllAuctions);

// protected: create an auction (multipart form with an "image" file field)
router.route("/").post(verifyJWT, upload.single("image"), createAuction);

// protected: the logged-in seller's own auctions
// NOTE: declared before "/:id" so GET /my isn't captured by the :id param route.
router.route("/my").get(verifyJWT, getMyAuctions);

// public: single auction by id
router.route("/:id").get(getAuctionById);

export default router;
