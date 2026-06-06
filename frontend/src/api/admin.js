import api from "./axios.js";

// Admin service layer. Every endpoint requires an admin token (the axios
// interceptor attaches it; the backend gate returns 403 for non-admins).
export const getStats = () => api.get("/admin/stats");
export const getUsers = (params) => api.get("/admin/users", { params });
export const deleteUser = (id) => api.delete(`/admin/users/${id}`);
export const getAuctions = (params) => api.get("/admin/auctions", { params });
export const deleteAuction = (id) => api.delete(`/admin/auctions/${id}`);
