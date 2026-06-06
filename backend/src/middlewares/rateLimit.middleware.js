import rateLimit from "express-rate-limit";

// Risk #2 fix: cap how many requests a single IP can make, so attackers can't
// brute-force passwords or flood the API. Counts are kept in memory (fine for a
// single-server dev/hobby setup; swap for a Redis store if you scale out).

const jsonMessage = (message) => ({ success: false, message });

// General backstop for the whole API. Deliberately generous so normal browsing
// and bidding are never affected — it only catches genuine floods/scraping.
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 600, // ~40 requests/min per IP
  standardHeaders: true, // expose RateLimit-* headers so clients can see their budget
  legacyHeaders: false,
  message: jsonMessage("Too many requests — please slow down and try again shortly."),
});

// Strict limiter for the auth endpoints (login / register / refresh). This is the
// actual brute-force defence: only a handful of attempts per IP per window.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: jsonMessage(
    "Too many attempts — please wait a few minutes and try again."
  ),
});
