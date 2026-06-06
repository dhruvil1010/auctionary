import { Auction } from "../models/auction.model.js";
import { AUCTION_STATUS } from "../constants.js";
import {
  SOCKET_EVENTS,
  auctionRoom,
  emitAuctionEnded,
  emitWon,
} from "../sockets/auction.socket.js";

// How often we scan the DB for auctions to start or close (milliseconds).
const SCAN_INTERVAL_MS = 5000;

/**
 * One scan pass:
 *   1) UPCOMING -> LIVE for auctions whose startTime has arrived
 *   2) LIVE/UPCOMING -> ENDED for auctions past their endTime (set winner + notify)
 *
 * Why a periodic scanner instead of a setTimeout per auction?
 *   - It survives server restarts (the schedule lives in the DB, not in memory).
 *   - It self-reconciles: auctions that expired while the server was down get closed
 *     on the first pass after boot.
 *   - It's simple and scales fine here. Trade-off: up to SCAN_INTERVAL_MS of lag on the
 *     "ended" status — which is harmless, because placeBid already rejects any bid past
 *     endTime via its atomic guard (endTime > now), so no late bids can slip in during
 *     that window.
 */
const runExpiryScan = async (io) => {
  const now = new Date();

  // 1) UPCOMING -> LIVE (start time reached, not yet past end time)
  const toActivate = await Auction.find({
    status: AUCTION_STATUS.UPCOMING,
    startTime: { $lte: now },
    endTime: { $gt: now },
  });

  for (const auction of toActivate) {
    // Atomic guard so two overlapping scans can't both flip it.
    const matched = await Auction.findOneAndUpdate(
      { _id: auction._id, status: AUCTION_STATUS.UPCOMING },
      { $set: { status: AUCTION_STATUS.LIVE } }
    );
    if (matched) {
      io.to(auctionRoom(auction._id.toString())).emit(SOCKET_EVENTS.STARTED, {
        auctionId: auction._id,
        title: auction.title,
      });
    }
  }

  // 2) LIVE/UPCOMING past endTime -> ENDED (decide winner + notify)
  const expired = await Auction.find({
    status: { $in: [AUCTION_STATUS.LIVE, AUCTION_STATUS.UPCOMING] },
    endTime: { $lte: now },
  }).populate("currentHighestBidder", "username");

  for (const auction of expired) {
    const winnerUser = auction.currentHighestBidder; // { _id, username } or null
    const winnerId = winnerUser ? winnerUser._id : null;

    // Atomic guard so the same auction isn't closed twice by overlapping scans.
    const matched = await Auction.findOneAndUpdate(
      {
        _id: auction._id,
        status: { $in: [AUCTION_STATUS.LIVE, AUCTION_STATUS.UPCOMING] },
      },
      { $set: { status: AUCTION_STATUS.ENDED, winner: winnerId } }
    );
    if (!matched) continue; // already closed by an earlier pass

    console.log(
      `🏁 Auction ${auction._id} ended — winner: ${
        winnerUser ? winnerUser.username : "no bids"
      } @ ${auction.currentPrice}`
    );

    // Tell everyone watching that the auction has closed (drives the winner banner).
    emitAuctionEnded(io, auction._id.toString(), {
      auctionId: auction._id,
      title: auction.title,
      finalPrice: auction.currentPrice,
      winner: winnerUser
        ? { _id: winnerUser._id, username: winnerUser.username }
        : null,
    });

    // Personally notify the winner (reaches them even if they're not on the page).
    if (winnerId) {
      emitWon(io, winnerId, {
        auctionId: auction._id,
        title: auction.title,
        finalPrice: auction.currentPrice,
      });
    }
  }
};

/**
 * Start the recurring expiry scanner. Returns the interval handle.
 * A re-entrancy guard skips a tick if the previous pass is still running, so a slow
 * DB scan can never overlap itself.
 */
export const startAuctionExpiryJob = (io) => {
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await runExpiryScan(io);
    } catch (err) {
      console.log("❌ Auction expiry scan failed:", err.message);
    } finally {
      running = false;
    }
  };

  // Run once immediately (reconcile anything overdue from downtime), then on an interval.
  tick();
  const handle = setInterval(tick, SCAN_INTERVAL_MS);
  console.log(`⏰ Auction expiry job started (scans every ${SCAN_INTERVAL_MS / 1000}s)`);
  return handle;
};
