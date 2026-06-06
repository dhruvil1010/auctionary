import api from "./axios.js";

// Auth service layer — every auth-related API call lives here so pages don't
// hardcode URLs. Each returns an axios promise; the payload is res.data.data.
export const registerUser = (data) => api.post("/users/register", data);
export const loginUser = (data) => api.post("/users/login", data);
export const logoutUser = () => api.post("/users/logout");
export const getCurrentUser = () => api.get("/users/current-user");
export const getProfile = () => api.get("/users/profile");
