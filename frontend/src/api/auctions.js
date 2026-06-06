import api from "./axios.js";

// Auction service layer.
// getAuctions accepts query params: page, limit, category, status, minPrice,
// maxPrice, search, sort (newest | endingSoon | priceLow | priceHigh).
export const getAuctions = (params) => api.get("/auctions", { params });
export const getAuction = (id) => api.get(`/auctions/${id}`);
export const getMyAuctions = () => api.get("/auctions/my");
export const createAuction = (formData) =>
  api.post("/auctions", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
