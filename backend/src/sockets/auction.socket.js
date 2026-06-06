// Shared Socket.io event names + room/emit helpers for auctions.
// Centralized so the REST controllers and the socket layer agree on event names.

export const SOCKET_EVENTS = {
  JOIN: "auction:join", // client -> server: start watching an auction
  LEAVE: "auction:leave", // client -> server: stop watching
  PARTICIPANTS: "auction:participants", // server -> room: live viewer count
  NEW_BID: "bid:new", // server -> room: a new accepted bid
  OUTBID: "auction:outbid", // server -> a specific user: you were outbid
  STARTED: "auction:started", // server -> room: an upcoming auction went live
  ENDED: "auction:ended", // server -> room: auction closed (winner decided)
  WON: "auction:won", // server -> the winner: you won this auction
};

export const auctionRoom = (auctionId) => `auction:${auctionId}`;
export const userRoom = (userId) => `user:${userId}`;

// Broadcast the current viewer count of an auction room. `delta` accounts for a
// socket that is mid-leave (still counted by the adapter), e.g. on disconnect.
const emitParticipantCount = (io, auctionId, delta = 0) => {
  const room = auctionRoom(auctionId);
  const size = io.sockets.adapter.rooms.get(room)?.size || 0;
  io.to(room).emit(SOCKET_EVENTS.PARTICIPANTS, {
    auctionId,
    count: Math.max(size + delta, 0),
  });
};

// ---- helpers the REST bid controller calls to fan out events ----

export const emitNewBid = (io, auctionId, payload) => {
  io.to(auctionRoom(auctionId)).emit(SOCKET_EVENTS.NEW_BID, payload);
};

export const emitOutbid = (io, userId, payload) => {
  io.to(userRoom(userId)).emit(SOCKET_EVENTS.OUTBID, payload);
};

export const emitAuctionEnded = (io, auctionId, payload) => {
  io.to(auctionRoom(auctionId)).emit(SOCKET_EVENTS.ENDED, payload);
};

export const emitWon = (io, userId, payload) => {
  io.to(userRoom(userId)).emit(SOCKET_EVENTS.WON, payload);
};

// ---- per-connection handlers (room join/leave + participant counts) ----

export const registerAuctionHandlers = (io, socket) => {
  // Client opens an auction page -> join its room and refresh the viewer count.
  socket.on(SOCKET_EVENTS.JOIN, ({ auctionId } = {}) => {
    if (!auctionId) return;
    socket.join(auctionRoom(auctionId));
    emitParticipantCount(io, auctionId);
  });

  // Client leaves the auction page -> leave the room and refresh the count.
  socket.on(SOCKET_EVENTS.LEAVE, ({ auctionId } = {}) => {
    if (!auctionId) return;
    socket.leave(auctionRoom(auctionId));
    emitParticipantCount(io, auctionId);
  });

  // On disconnect the socket is auto-removed from its rooms. At "disconnecting"
  // it is still listed, so we emit the decremented count to each auction room.
  socket.on("disconnecting", () => {
    for (const room of socket.rooms) {
      if (room.startsWith("auction:")) {
        const auctionId = room.slice("auction:".length);
        emitParticipantCount(io, auctionId, -1);
      }
    }
  });
};
