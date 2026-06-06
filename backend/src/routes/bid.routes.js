import { Router } from "express";
import { placeBid, buyNow, getAuctionBids } from "../controllers/bid.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// protected: place a bid
router.route("/").post(verifyJWT, placeBid);

// protected: buy the item now at the seller's buy-now price (ends the auction)
// NOTE: declared before "/:auctionId" so this fixed path isn't captured by the param route.
router.route("/buyout").post(verifyJWT, buyNow);

// public: bid history for a given auction (newest first, paginated)
router.route("/:auctionId").get(getAuctionBids);

export default router;
