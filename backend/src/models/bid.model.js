import mongoose, { Schema } from "mongoose";
import mongooseAggregatePaginate from "mongoose-aggregate-paginate-v2";

// One document per bid. This collection is the source of truth for bid history;
// the auction's currentPrice/currentHighestBidder/bidCount are a denormalized
// cache of "the latest accepted bid".
const bidSchema = new Schema(
  {
    auction: {
      type: Schema.Types.ObjectId,
      ref: "Auction",
      required: true,
      index: true,
    },
    bidder: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: [true, "Bid amount is required"],
      min: [0, "Bid amount cannot be negative"],
    },
  },
  { timestamps: true } // createdAt = the moment the bid was placed
);

// "Highest bid for an auction" and "this auction's bids, newest first".
bidSchema.index({ auction: 1, amount: -1 });
bidSchema.index({ auction: 1, createdAt: -1 });

// Enables Bid.aggregatePaginate(...) for paginated bid history.
bidSchema.plugin(mongooseAggregatePaginate);

export const Bid = mongoose.model("Bid", bidSchema);
