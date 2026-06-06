import api from "./axios.js";

// Bid service layer.
// placeBid is protected (the axios interceptor attaches the Bearer token).
export const placeBid = (payload) => api.post("/bids", payload); // { auctionId, amount }

// Buy the item immediately at the seller's buy-now price (ends the auction).
export const buyNow = (auctionId) => api.post("/bids/buyout", { auctionId });

// Public, paginated bid history (newest first).
export const getAuctionBids = (auctionId, params) =>
  api.get(`/bids/${auctionId}`, { params });
