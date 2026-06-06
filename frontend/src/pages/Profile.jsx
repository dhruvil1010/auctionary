import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProfile } from "../api/auth.js";
import { Container } from "../components";

const rupee = (n) => `₹${Number(n ?? 0).toLocaleString()}`;

// Small coloured pill used for statuses across the page.
function Badge({ children, tone = "ink" }) {
  const tones = {
    brand: "bg-brand/10 text-brand",
    accent: "bg-accent/10 text-accent",
    ink: "bg-page text-ink/60",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${tones[tone]}`}>
      {children}
    </span>
  );
}

// One clickable auction row (thumbnail + title), with a flexible right-hand slot
// each section fills with its own info (your bid, won price, listing status…).
function AuctionRow({ auction, right }) {
  return (
    <Link
      to={`/auctions/${auction._id}`}
      className="flex items-center gap-4 rounded-xl border border-border bg-surface p-3 transition hover:shadow-sm"
    >
      <img
        src={auction.image}
        alt={auction.title}
        className="h-16 w-16 shrink-0 rounded-lg bg-page object-cover"
      />
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-ink">{auction.title}</p>
        <p className="text-xs text-ink/50">{auction.category}</p>
      </div>
      <div className="shrink-0 text-right text-sm">{right}</div>
    </Link>
  );
}

// A titled section with a count and an empty-state fallback.
function Section({ title, count, empty, children }) {
  return (
    <section className="mt-8">
      <h2 className="font-heading text-xl font-semibold text-ink">
        {title} <span className="text-ink/40">({count})</span>
      </h2>
      {count === 0 ? (
        <p className="mt-2 text-sm text-ink/50">{empty}</p>
      ) : (
        <div className="mt-3 space-y-2">{children}</div>
      )}
    </section>
  );
}

// Work out how to label one of the user's own listings.
function listingStatus(a) {
  if (a.status === "live")
    return {
      label: "Live",
      tone: "brand",
      note: `${rupee(a.currentPrice)} · ${a.bidCount} bid${
        a.bidCount === 1 ? "" : "s"
      }`,
    };
  if (a.status === "upcoming")
    return { label: "Upcoming", tone: "ink", note: "Not started yet" };
  // status === "ended": sold if a winner was decided, otherwise no bids came in.
  if (a.winner) return { label: "Sold", tone: "brand", note: rupee(a.currentPrice) };
  return { label: "Unsold", tone: "ink", note: "No bids" };
}

export default function Profile() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getProfile()
      .then((res) => {
        if (active) setData(res.data.data);
      })
      .catch((err) => {
        if (active)
          setError(err.response?.data?.message || "Failed to load your profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <Container className="py-16">
        <p className="text-center text-ink/50">Loading your profile…</p>
      </Container>
    );
  }
  if (error || !data) {
    return (
      <Container className="py-16">
        <p className="text-center text-accent">{error || "Profile unavailable."}</p>
      </Container>
    );
  }

  const { user, stats, createdAuctions, activeBids, wonAuctions, lostBids } = data;

  return (
    <Container className="py-8">
      {/* header */}
      <div className="rounded-2xl border border-border bg-surface p-6">
        <div className="flex items-center gap-3">
          <h1 className="font-heading text-3xl font-bold text-ink">
            {user.username}
          </h1>
          {user.role === "admin" && <Badge tone="accent">Admin</Badge>}
        </div>
        <p className="mt-1 text-sm text-ink/60">{user.email}</p>

        {/* stat tiles */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Listings", value: stats.created },
            { label: "Active bids", value: stats.activeBids },
            { label: "Won", value: stats.won },
            { label: "Lost", value: stats.lost },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl bg-page px-4 py-3 text-center"
            >
              <p className="text-2xl font-bold text-ink">{s.value}</p>
              <p className="text-xs text-ink/50">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active bids — auctions you're competing in right now */}
      <Section
        title="Active bids"
        count={activeBids.length}
        empty="You're not bidding on anything live right now."
      >
        {activeBids.map(({ auction, yourHighestBid, isHighestBidder }) => (
          <AuctionRow
            key={auction._id}
            auction={auction}
            right={
              <div className="flex flex-col items-end gap-1">
                <Badge tone={isHighestBidder ? "brand" : "accent"}>
                  {isHighestBidder ? "Winning" : "Outbid"}
                </Badge>
                <span className="text-ink/60">
                  Current {rupee(auction.currentPrice)}
                </span>
                <span className="text-xs text-ink/40">
                  You {rupee(yourHighestBid)}
                </span>
              </div>
            }
          />
        ))}
      </Section>

      {/* Won — auctions that ended with you as the highest bidder */}
      <Section
        title="Won"
        count={wonAuctions.length}
        empty="No wins yet — keep bidding!"
      >
        {wonAuctions.map((auction) => (
          <AuctionRow
            key={auction._id}
            auction={auction}
            right={
              <div className="flex flex-col items-end gap-1">
                <Badge tone="brand">Won 🏆</Badge>
                <span className="text-ink/60">{rupee(auction.currentPrice)}</span>
              </div>
            }
          />
        ))}
      </Section>

      {/* Lost — auctions you bid on that ended with someone else winning */}
      <Section
        title="Lost"
        count={lostBids.length}
        empty="No lost bids — nice!"
      >
        {lostBids.map(({ auction, yourHighestBid }) => (
          <AuctionRow
            key={auction._id}
            auction={auction}
            right={
              <div className="flex flex-col items-end gap-1">
                <Badge tone="ink">Lost</Badge>
                <span className="text-ink/60">
                  Sold {rupee(auction.currentPrice)}
                </span>
                <span className="text-xs text-ink/40">
                  You {rupee(yourHighestBid)}
                </span>
              </div>
            }
          />
        ))}
      </Section>

      {/* My listings — items you put up, with sold / unsold / live status */}
      <Section
        title="My listings"
        count={createdAuctions.length}
        empty="You haven't listed any items yet."
      >
        {createdAuctions.map((auction) => {
          const s = listingStatus(auction);
          return (
            <AuctionRow
              key={auction._id}
              auction={auction}
              right={
                <div className="flex flex-col items-end gap-1">
                  <Badge tone={s.tone}>{s.label}</Badge>
                  <span className="text-ink/60">{s.note}</span>
                </div>
              }
            />
          );
        })}
      </Section>
    </Container>
  );
}