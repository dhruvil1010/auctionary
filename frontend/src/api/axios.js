import axios from "axios";
import conf from "../conf/conf.js";

// A single axios instance used by all API calls.
// - baseURL points at the backend's /api/v1
// - withCredentials lets the browser send/receive the httpOnly refresh cookie
const api = axios.create({
  baseURL: conf.apiUrl,
  withCredentials: true,
});

// Attach the access token (kept in localStorage, per the spec) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
