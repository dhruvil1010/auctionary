import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { getAuction } from "../api/auctions.js";
import { getAuctionBids, placeBid, buyNow } from "../api/bids.js";
import { connectSocket } from "../lib/socket.js";
import { useAuth } from "../context/AuthContext.jsx";
import { Container, Button, CountdownTimer } from "../components";
import { SOCKET_EVENTS, MIN_BID_INCREMENT_PERCENT } from "../constants.js";

const rupee = (n) => `₹${Number(n ?? 0).toLocaleString()}`;
const sameId = (a, b) => String(a ?? "") === String(b ?? "");

// The smallest bid the server will accept right now (mirrors the backend rule):
// first bid >= startingPrice, otherwise currentPrice + 5%.
function nextMinBid(auction) {
  if (!auction) return 0;
  if (auction.bidCount === 0) return Number(auction.startingPrice);
  return Math.ceil(
    Number(auction.currentPrice) * (1 + MIN_BID_INCREMENT_PERCENT / 100)
  );
}

export default function AuctionDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();

  // ---- data ----
  const [auction, setAuction] = useState(null);
  const [bids, setBids] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---- live / realtime state ----
  const [participants, setParticipants] = useState(0);
  const [endedInfo, setEndedInfo] = useState(null); // { finalPrice, winner } from server
  const [timeUp, setTimeUp] = useState(false); // local clock hit zero
  const [outbidMsg, setOutbidMsg] = useState("");
  const [wonMsg, setWonMsg] = useState("");

  // ---- bid form ----
  const [amount, setAmount] = useState("");
  const [bidError, setBidError] = useState("");
  const [bidLoading, setBidLoading] = useState(false);
  const [buyLoading, setBuyLoading] = useState(false); // buy-now in flight

  // 1) Initial load: the auction + its current bid history (one render once both land).
  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([getAuction(id), getAuctionBids(id, { limit: 20 })])
      .then(([aRes, bRes]) => {
        if (!active) return;
        setAuction(aRes.data.data);
        setBids(bRes.data.data.docs || []);
        setError("");
      })
      .catch((err) => {
        if (active)
          setError(err.response?.data?.message || "Failed to load this auction.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [id]);

  // 2) Realtime: join this auction's room and react to live events.
  useEffect(() => {
    const socket = connectSocket();
    socket.emit(SOCKET_EVENTS.JOIN, { auctionId: id });

    // Live viewer count for this auction.
    socket.on(SOCKET_EVENTS.PARTICIPANTS, (p) => setParticipants(p.count));

    // A new accepted bid (from anyone, including ourselves) — update the headline
    // price + leader and push it to the top of the feed.
    socket.on(SOCKET_EVENTS.NEW_BID, (b) => {
      setAuction((prev) =>
        prev
          ? {
              ...prev,
              currentPrice: b.currentPrice,
              bidCount: b.bidCount,
              currentHighestBidder: b.bidder,
            }
          : prev
      );
      setBids((prev) => [
        {
          _id: b.bidId,
          amount: b.amount,
          bidder: b.bidder,
          createdAt: b.createdAt,
        },
        ...prev,
      ]);
    });

    // Personal: someone outran our leading bid (only show it for THIS auction).
    socket.on(SOCKET_EVENTS.OUTBID, (o) => {
      if (sameId(o.auctionId, id))
        setOutbidMsg(`You were outbid by ${o.by} — new bid ${rupee(o.newAmount)}.`);
    });

    // Upcoming auction just went live.
    socket.on(SOCKET_EVENTS.STARTED, () => {
      setAuction((prev) => (prev ? { ...prev, status: "live" } : prev));
    });

    // Auction closed: lock the UI and show the winner.
    socket.on(SOCKET_EVENTS.ENDED, (e) => {
      setEndedInfo({ finalPrice: e.finalPrice, winner: e.winner });
      setTimeUp(true);
      setAuction((prev) =>
        prev ? { ...prev, status: "ended", winner: e.winner } : prev
      );
    });

    // Personal: we won (only celebrate for THIS auction).
    socket.on(SOCKET_EVENTS.WON, (w) => {
      if (sameId(w.auctionId, id)) setWonMsg("🎉 You won this auction!");
    });

    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE, { auctionId: id });
      socket.disconnect();
    };
  }, [id]);

  const onBid = async (e) => {
    e.preventDefault();
    setBidError("");

    const value = Number(amount);
    const min = nextMinBid(auction);
    if (Number.isNaN(value) || value <= 0) {
      setBidError("Enter a valid amount.");
      return;
    }
    if (value < min) {
      setBidError(`Your bid must be at least ${rupee(min)}.`);
      return;
    }

    setBidLoading(true);
    try {
      await placeBid({ auctionId: id, amount: value });
      setAmount("");
      setOutbidMsg(""); // we've retaken the lead; clear any stale "outbid" notice
      // The UI updates from the bid:new socket event (server emits to us too).
    } catch (err) {
      setBidError(err.response?.data?.message || "Could not place your bid.");
    } finally {
      setBidLoading(false);
    }
  };

  const onBuyNow = async () => {
    if (
      !window.confirm(
        `Buy this item now for ${rupee(
          auction.buyoutPrice
        )}? This ends the auction immediately and you win it.`
      )
    )
      return;
    setBidError("");
    setBuyLoading(true);
    try {
      await buyNow(id);
      // The auction:ended + auction:won socket events flip the UI to "you won".
    } catch (err) {
      setBidError(err.response?.data?.message || "Could not complete the purchase.");
    } finally {
      setBuyLoading(false);
    }
  };

  // ---- loading / error / not-found ----
  if (loading) {
    return (
      <Container className="py-16">
        <p className="text-center text-ink/50">Loading auction…</p>
      </Container>
    );
  }
  if (error || !auction) {
    return (
      <Container className="py-16">
        <p className="text-center text-accent">{error || "Auction not found."}</p>
        <p className="mt-4 text-center">
          <Link to="/" className="font-semibold text-brand hover:underline">
            ← Back to auctions
          </Link>
        </p>
      </Container>
    );
  }

  // ---- derived flags ----
  const ended = auction.status === "ended" || timeUp || !!endedInfo;
  const isUpcoming = auction.status === "upcoming" && !ended;
  const isLive = auction.status === "live" && !ended;

  const sellerId = auction.seller?._id ?? auction.seller;
  const isSeller = user && sameId(sellerId, user._id);
  const isHighest =
    user &&
    auction.currentHighestBidder &&
    sameId(auction.currentHighestBidder._id, user._id);

  const winner = endedInfo?.winner ?? auction.winner ?? null;
  const finalPrice = endedInfo?.finalPrice ?? auction.currentPrice;
  const youWon = user && winner && sameId(winner._id, user._id);

  const minBid = nextMinBid(auction);

  // Buy-now is offered while the auction is live and bidding hasn't reached the
  // seller's buy-now price yet. (Eligibility — logged in, not the seller — is the
  // same as bidding; the server re-checks everything.)
  const hasBuyout = auction.buyoutPrice != null;
  const canBuyNow =
    hasBuyout && isLive && Number(auction.currentPrice) < Number(auction.buyoutPrice);

  return (
    <Container className="py-8">
      <Link to="/" className="text-sm text-ink/60 hover:text-brand">
        ← Back to auctions
      </Link>

      {/* personal notifications */}
      {wonMsg && (
        <div className="mt-4 rounded-lg bg-brand/10 px-4 py-3 text-sm font-semibold text-brand">
          {wonMsg}
        </div>
      )}
      {outbidMsg && !ended && (
        <div className="mt-4 flex items-center justify-between rounded-lg bg-accent/10 px-4 py-3 text-sm text-accent">
          <span>{outbidMsg}</span>
          <button
            onClick={() => setOutbidMsg("")}
            className="ml-3 shrink-0 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* left: image */}
        <div className="overflow-hidden rounded-2xl border border-border bg-page">
          <img
            src={auction.image}
            alt={auction.title}
            className="aspect-[4/3] w-full object-cover"
          />
        </div>

        {/* right: details + bidding */}
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-page px-2.5 py-0.5 text-xs font-medium text-ink/60">
              {auction.category}
            </span>
            {isLive && (
              <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2.5 py-0.5 text-xs font-semibold text-brand">
                <span className="h-1.5 w-1.5 rounded-full bg-brand" /> Live
              </span>
            )}
            {isUpcoming && (
              <span className="rounded-full bg-page px-2.5 py-0.5 text-xs font-semibold text-ink/60">
                Upcoming
              </span>
            )}
            {ended && (
              <span className="rounded-full bg-ink/10 px-2.5 py-0.5 text-xs font-semibold text-ink/60">
                Ended
              </span>
            )}
          </div>

          <h1 className="mt-3 font-heading text-3xl font-bold text-ink">
            {auction.title}
          </h1>
          <p className="mt-1 text-sm text-ink/60">
            by {auction.seller?.username || "Unknown seller"}
          </p>

          {/* price + countdown */}
          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink/50">
                  {auction.bidCount > 0 ? "Current bid" : "Starting price"}
                </p>
                <p className="text-3xl font-bold text-ink">
                  {rupee(auction.currentPrice)}
                </p>
                <p className="mt-1 text-xs text-ink/50">
                  {auction.bidCount} bid{auction.bidCount === 1 ? "" : "s"}
                  {auction.currentHighestBidder &&
                    ` · leading: ${auction.currentHighestBidder.username}`}
                </p>
                {hasBuyout && !ended && (
                  <p className="mt-1 text-xs font-semibold text-accent">
                    Buy now: {rupee(auction.buyoutPrice)}
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-ink/50">
                  {ended ? "Closed" : "Time left"}
                </p>
                <CountdownTimer
                  endTime={auction.endTime}
                  onEnd={() => setTimeUp(true)}
                  className="text-xl font-bold"
                />
                <p className="mt-1 text-xs text-ink/50">{participants} watching</p>
              </div>
            </div>

            {/* bidding area */}
            <div className="mt-5 border-t border-border pt-5">
              {ended ? (
                <div className="rounded-lg bg-page px-4 py-3 text-sm">
                  {winner ? (
                    <span className="font-semibold text-ink">
                      {youWon ? "You won" : `Won by ${winner.username}`} for{" "}
                      {rupee(finalPrice)} 🏆
                    </span>
                  ) : (
                    <span className="text-ink/60">
                      This auction ended with no bids.
                    </span>
                  )}
                </div>
              ) : isUpcoming ? (
                <p className="text-sm text-ink/60">
                  Bidding opens when this auction goes live.
                </p>
              ) : !user ? (
                <Link
                  to="/login"
                  state={{ from: location.pathname }}
                  className="inline-flex rounded-full bg-brand px-5 py-2.5 font-semibold text-white hover:opacity-90"
                >
                  Log in to place a bid
                </Link>
              ) : isSeller ? (
                <p className="text-sm text-ink/60">
                  This is your auction — sellers can't bid.
                </p>
              ) : (
                <div className="space-y-4">
                  {isHighest ? (
                    <p className="text-sm font-semibold text-brand">
                      You're the highest bidder 🎉
                    </p>
                  ) : (
                    <form onSubmit={onBid}>
                      <p className="mb-2 text-xs text-ink/50">
                        Enter {rupee(minBid)} or more
                      </p>
                      <div className="flex gap-2">
                        <span className="flex items-center rounded-lg border border-border bg-page px-3 text-ink/60">
                          ₹
                        </span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          min={minBid}
                          step="1"
                          placeholder={String(minBid)}
                          className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-ink outline-none focus:border-brand"
                        />
                        <Button type="submit" disabled={bidLoading} className="shrink-0">
                          {bidLoading ? "Bidding…" : "Place bid"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {canBuyNow && (
                    <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
                      <Button
                        type="button"
                        variant="accent"
                        onClick={onBuyNow}
                        disabled={buyLoading}
                        className="shrink-0"
                      >
                        {buyLoading
                          ? "Processing…"
                          : `Buy now for ${rupee(auction.buyoutPrice)}`}
                      </Button>
                      <span className="text-xs text-ink/50">
                        Skip the bidding and win it instantly.
                      </span>
                    </div>
                  )}

                  {bidError && <p className="text-sm text-accent">{bidError}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* description */}
      <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ink">
            Description
          </h2>
          <p className="mt-2 whitespace-pre-line text-ink/70">
            {auction.description}
          </p>
        </div>

        {/* live bid feed */}
        <div>
          <h2 className="font-heading text-xl font-semibold text-ink">
            Bid history
          </h2>
          {bids.length === 0 ? (
            <p className="mt-2 text-sm text-ink/50">
              No bids yet — be the first.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border bg-surface">
              {bids.map((b, i) => (
                <li
                  key={b._id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <span className="font-medium text-ink">
                      {b.bidder?.username || "Anonymous"}
                    </span>
                    {i === 0 && !ended && (
                      <span className="ml-2 rounded-full bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand">
                        Highest
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-ink">{rupee(b.amount)}</span>
                    <span className="ml-3 text-xs text-ink/40">
                      {new Date(b.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Container>
  );
}
