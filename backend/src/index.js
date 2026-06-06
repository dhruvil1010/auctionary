// IMPORTANT: this must be the very first import so environment variables are
// loaded into process.env BEFORE any other module (like app.js) reads them.
import "dotenv/config";

import http from "http";
import connectDB from "./db/index.js";
import { app } from "./app.js";
import initializeSocket from "./sockets/index.js";
import { startAuctionExpiryJob } from "./jobs/auctionExpiry.js";
import { validateEnv } from "./utils/validateEnv.js";

// Fail-closed: refuse to start if secrets are missing/weak (see Risk #1).
try {
  validateEnv();
} catch (err) {
  console.error("❌ Environment validation failed:", err.message);
  process.exit(1);
}

const PORT = process.env.PORT || 8000;

// Connect to MongoDB first; only start the server if the database is reachable.
connectDB()
  .then(() => {
    // Wrap the Express app in a raw Node HTTP server so Express (HTTP routes)
    // and Socket.io (real-time) can share the same server and port.
    const server = http.createServer(app);

    // Attach the real-time (Socket.io) layer to that server, and expose the io
    // instance on the app so REST controllers can emit events via req.app.get("io").
    const io = initializeSocket(server);
    app.set("io", io);

    // Background job: auto-close auctions past their endTime, set the winner, notify.
    startAuctionExpiryJob(io);

    server.on("error", (error) => {
      console.log("❌ SERVER ERROR: ", error);
      throw error;
    });

    server.listen(PORT, () => {
      console.log(`⚙️  Server running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB connection failed: ", err);
  });
