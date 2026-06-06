// Frontend copy of the fixed lists (the backend is the source of truth; these are
// just for building filter dropdowns). Keep in sync with backend/src/constants.js.
export const CATEGORIES = [
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

export const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "endingSoon", label: "Ending soon" },
  { value: "priceLow", label: "Price: low to high" },
  { value: "priceHigh", label: "Price: high to low" },
];

// The seller picks an exact end date + time. The only rule is a hard ceiling on
// how far out that can be — must match backend MAX_AUCTION_DURATION_HOURS (10 days).
export const MAX_DURATION_DAYS = 10;
export const MAX_DURATION_HOURS = MAX_DURATION_DAYS * 24; // 240

// Socket.io event names — must match backend SOCKET_EVENTS exactly
// (backend/src/sockets/auction.socket.js).
export const SOCKET_EVENTS = {
  JOIN: "auction:join", // client -> server: start watching an auction
  LEAVE: "auction:leave", // client -> server: stop watching
  PARTICIPANTS: "auction:participants", // server -> room: live viewer count
  NEW_BID: "bid:new", // server -> room: a new accepted bid
  OUTBID: "auction:outbid", // server -> you: you were outbid
  STARTED: "auction:started", // server -> room: upcoming auction went live
  ENDED: "auction:ended", // server -> room: auction closed (winner decided)
  WON: "auction:won", // server -> you: you won
};

// Min bid step, mirrors backend MIN_BID_INCREMENT_PERCENT (for the UI hint only;
// the server is the real enforcer).
export const MIN_BID_INCREMENT_PERCENT = 5;
