// App-wide constant values, kept in one place so models, controllers and the
// frontend all agree on the same enums/rules (single source of truth).

// DB_NAME is appended to MONGODB_URI so all our collections live inside a
// database literally named "auction".
export const DB_NAME = "auction";

// ---- User roles ----
// Every signup is a "user" (can both buy and sell). "admin" is seeded manually
// and only used for moderation + the dashboard.
export const USER_ROLES = ["user", "admin"];

// ---- Auction lifecycle states ----
export const AUCTION_STATUS = {
  UPCOMING: "upcoming", // startTime is in the future
  LIVE: "live", // accepting bids
  ENDED: "ended", // closed; winner decided
};

// ---- Fixed category list (buyers filter by these) ----
export const AUCTION_CATEGORIES = [
  "Art",
  "Watches",
  "Jewellery",
  "Antiques",
  "Collectibles",
  "Coins & Stamps",
  "Classic Cars",
  "Books & Manuscripts",
  "Fashion",
  "Electronics",
  "Musical Instruments",
  "Sports Memorabilia",
  "Furniture",
  "Other",
];

// ---- Bidding rules ----
// A new bid must beat the current price by AT LEAST this percentage of the
// current price, so the minimum step scales with the money involved
// (5% of 100 = 5; 5% of 100000 = 5000). Tunable in one place.
// NOTE: this is only the MINIMUM floor — the bidder enters their own amount and
// may bid ANY value >= currentPrice + this increment (free to jump higher).
export const MIN_BID_INCREMENT_PERCENT = 5;

// A finite safety ceiling on any money value (starting price or bid amount).
// Risk #4: without this, inputs like `Infinity` (e.g. JSON `1e400`) or absurd
// overflow numbers would be accepted and could permanently lock an auction. ₹1e12
// is far above any realistic auction, so it never constrains a genuine bid.
export const MAX_PRICE = 1_000_000_000_000; // 1e12

// Risk #8: hard ceiling on how many items one page request can return, so a
// caller can't ask for `?limit=100000000` and exhaust the server's memory.
export const MAX_PAGE_LIMIT = 100;

// ---- Auction duration presets (milliseconds) ----
// Kept for convenience/back-compat: a seller may send one of these preset keys
// OR a "custom" duration with an explicit durationHours value.
export const AUCTION_DURATIONS = {
  "1h": 1 * 60 * 60 * 1000,
  "6h": 6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

// Hard upper limit on how long any auction may run: 10 days.
// The seller chooses the duration freely, but it can never exceed this ceiling.
export const MAX_AUCTION_DURATION_HOURS = 10 * 24; // 240 hours
