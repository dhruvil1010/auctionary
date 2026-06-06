import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";
import { AUCTION_CATEGORIES, AUCTION_STATUS } from "../constants.js";

const auctionSchema = new Schema(
  {
    // ---- item details ----
    title: {
      type: String,
      required: [true, "Title is required"],
      trim: true,
      index: true, // supports title search
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
    },
    image: {
      type: String, // Cloudinary URL
      required: [true, "Image is required"],
    },
    category: {
      type: String,
      enum: AUCTION_CATEGORIES,
      required: [true, "Category is required"],
      index: true, // supports category filter
    },

    // ---- pricing ----
    startingPrice: {
      type: Number,
      required: [true, "Starting price is required"],
      min: [0, "Starting price cannot be negative"],
    },
    // Optional "buy it now" price. When set it must be ABOVE the starting price
    // (enforced in the controller). A buyer who pays it wins instantly and the
    // auction ends. null = no buy-now option.
    buyoutPrice: {
      type: Number,
      default: null,
      min: [0, "Buyout price cannot be negative"],
    },

    // ---- denormalized "current state" (source of truth is the bids collection) ----
    // Kept here so reads are O(1) and so a single atomic findOneAndUpdate can
    // accept/reject a bid without scanning all bids (race-condition safety).
    currentPrice: {
      type: Number,
      default: 0, // set to startingPrice on creation (see pre-save hook)
    },
    currentHighestBidder: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    bidCount: {
      type: Number,
      default: 0,
    },

    // ---- ownership ----
    seller: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    // ---- lifecycle ----
    status: {
      type: String,
      enum: Object.values(AUCTION_STATUS),
      default: AUCTION_STATUS.LIVE, // controller sets UPCOMING if startTime is in the future
      index: true,
    },
    startTime: {
      type: Date,
      default: Date.now, // live immediately by default
    },
    endTime: {
      type: Date,
      required: [true, "End time is required"],
      index: true, // the expiry scanner queries by this
    },
    winner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null, // set when the auction ends (= last currentHighestBidder)
    },
  },
  { timestamps: true }
);

// Compound index for the most common listing query: live auctions sorted by
// soonest-ending ("ending soon"), and for the expiry scan.
auctionSchema.index({ status: 1, endTime: 1 });

// On creation, the current price starts at the starting price.
// (async hook, promise-style — no `next`, consistent with the User model.)
auctionSchema.pre("save", async function () {
  if (this.isNew && (this.currentPrice === 0 || this.currentPrice == null)) {
    this.currentPrice = this.startingPrice;
  }
});

// Enables Auction.aggregatePaginate(...) for paginated/filtered listings.
auctionSchema.plugin(mongooseAggregatePaginate);

export const Auction = mongoose.model("Auction", auctionSchema);
