import { useEffect, useState } from "react";

// Turns a millisecond remainder into a short human label.
function format(ms) {
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

/**
 * Live countdown to a server-provided endTime (an absolute timestamp). We tick the
 * client clock every second toward that fixed moment — the server still enforces the
 * real deadline on bids, so this is display-only and can't be gamed.
 */
export default function CountdownTimer({ endTime, className = "", onEnd }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = new Date(endTime).getTime() - now;
  const ended = remaining <= 0;
  const urgent = !ended && remaining < 60 * 60 * 1000; // under 1 hour

  // Optional: tell the parent the moment the clock hits zero (fires once, since
  // `ended` then stays true). The Auction Detail page uses this to flip the UI to
  // its "ended" state even before the server's close event arrives.
  useEffect(() => {
    if (ended && onEnd) onEnd();
  }, [ended]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <span
      className={`${
        ended ? "text-ink/50" : urgent ? "text-accent" : "text-ink/70"
      } ${className}`}
    >
      {ended ? "Ended" : format(remaining)}
    </span>
  );
}
