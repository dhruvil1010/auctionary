import { Link } from "react-router-dom";
import CountdownTimer from "./CountdownTimer.jsx";

// A single auction tile in the browse grid.
export default function AuctionCard({ auction }) {
  return (
    <Link
      to={`/auctions/${auction._id}`}
      className="group block overflow-hidden rounded-xl border border-border bg-surface shadow-sm transition hover:shadow-md"
    >
      <div className="aspect-[4/3] overflow-hidden bg-page">
        <img
          src={auction.image}
          alt={auction.title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-full bg-page px-2 py-0.5 text-xs font-medium text-ink/60">
            {auction.category}
          </span>
          {auction.status === "upcoming" && (
            <span className="text-xs font-semibold text-brand">Upcoming</span>
          )}
        </div>

        <h3 className="mt-2 line-clamp-1 font-heading text-lg font-semibold text-ink">
          {auction.title}
        </h3>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <p className="text-xs text-ink/50">Current bid</p>
            <p className="text-lg font-bold text-ink">
              ₹{Number(auction.currentPrice ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink/50">
              {auction.bidCount} bid{auction.bidCount === 1 ? "" : "s"}
            </p>
            <CountdownTimer
              endTime={auction.endTime}
              className="text-sm font-semibold"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
