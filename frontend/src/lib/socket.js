import { io } from "socket.io-client";
import conf from "../conf/conf.js";

/**
 * Open a fresh Socket.io connection to the backend.
 *
 * We pass the current access token in the handshake (`auth.token`). If it's valid
 * the server drops us into our personal `user:<id>` room, which is how we receive
 * targeted notifications like "you were outbid" / "you won". A logged-out visitor
 * connects fine too (token is just undefined) — they can still watch live bids,
 * they only miss the personal notifications.
 *
 * The caller owns the connection's lifecycle (disconnect on unmount).
 */
export function connectSocket() {
  return io(conf.socketUrl, {
    auth: { token: localStorage.getItem("accessToken") || undefined },
  });
}
