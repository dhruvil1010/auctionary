import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { apiLimiter } from "./middlewares/rateLimit.middleware.js";

const app = express();

// ---- Global middleware ----

// Allow the React frontend (a different origin/port) to call this API and send cookies.
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
  })
);

// Parse incoming JSON bodies (capped to guard against huge payloads).
app.use(express.json({ limit: "16kb" }));

// Parse URL-encoded form bodies.
app.use(express.urlencoded({ extended: true, limit: "16kb" }));

// Serve static files placed in /public directly.
app.use(express.static("public"));

// Read cookies on incoming requests (we'll store the refresh token in an httpOnly cookie).
app.use(cookieParser());

// ---- Health check ----
// A simple route to confirm the API is alive (handy for quick tests & deployment checks).
app.get("/", (req, res) => {
  res.status(200).json({ status: "ok", message: "Auction API is running 🚀" });
});

// ---- Rate limiting ----
// General per-IP backstop on the whole API (Risk #2). Auth routes get a stricter
// limiter applied inside user.routes.js.
app.use("/api", apiLimiter);

// ---- Feature routes ----
import userRouter from "./routes/user.routes.js";
import auctionRouter from "./routes/auction.routes.js";
import bidRouter from "./routes/bid.routes.js";
import adminRouter from "./routes/admin.routes.js";

app.use("/api/v1/users", userRouter);
app.use("/api/v1/auctions", auctionRouter);
app.use("/api/v1/bids", bidRouter);
app.use("/api/v1/admin", adminRouter);

// ---- Central error handler (MUST be registered last, after all routes) ----
import { errorHandler } from "./middlewares/error.middleware.js";

app.use(errorHandler);

export { app };
