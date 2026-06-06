import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { registerAuctionHandlers } from "./auction.socket.js";

/**
 * Create the Socket.io server and wire optional auth + per-connection handlers.
 *
 * Auth is OPTIONAL: a client may pass an access token in the handshake
 * (auth.token). If it's valid, we attach `socket.user` and put the socket in a
 * personal room ("user:<id>") so we can deliver targeted events like
 * "you've been outbid". Clients without a token are still allowed as anonymous
 * viewers (they can watch live bids, they just don't get personal notifications).
 */
const initializeSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        socket.user = { _id: decoded._id, username: decoded.username };
      } catch (err) {
        // Invalid token -> treat as an anonymous viewer (don't reject the socket).
      }
    }
    next();
  });

  io.on("connection", (socket) => {
    if (socket.user) socket.join(`user:${socket.user._id}`);

    console.log(
      `🔌 Socket connected: ${socket.id} ${
        socket.user ? `(user ${socket.user.username})` : "(guest)"
      }`
    );

    registerAuctionHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

export default initializeSocket;
