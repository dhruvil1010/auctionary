# Auctionary — Frontend (React + Vite)

The web client for **Auctionary**, a real-time auction platform. A single-page app built with **React 19, Vite 8, React Router 7, and Tailwind CSS v4**, talking to the backend over REST + Socket.io.

> This is the client only — it needs the API running. For the full project overview and screenshots, see the [root README](../README.md). For the API, see [`backend/README.md`](../backend/README.md).

---

## Features

- Browse / search / filter auctions with pagination.
- **Live auction detail** page — real-time bids, countdown timer, outbid/won alerts (Socket.io).
- Place bids (5% minimum increment) and **buy-now** instant purchase.
- Create listings with image upload and a date/time end picker.
- **Profile** — your active bids, wins, losses, and listings.
- **Admin** dashboard (admins only).
- 🌙 **Dark / light mode** with no flash on reload.

---

## Tech stack

| Tool | Purpose |
|------|---------|
| React 19 | UI library |
| Vite 8 | Dev server & build tool |
| React Router 7 | Client-side routing |
| Tailwind CSS v4 | Styling (semantic design tokens + dark mode) |
| Axios | HTTP client (service layer) |
| socket.io-client | Real-time updates |

---

## Folder structure

```
src/
├── main.jsx        # entry: Theme + Auth providers wrap the Router
├── App.jsx         # layout shell (Navbar + page outlet + Footer)
├── index.css       # Tailwind import + @theme design tokens + .dark overrides
├── conf/           # reads VITE_* env vars into one config object
├── api/            # axios instance + service layer (one file per resource)
├── lib/            # socket.io connection factory
├── context/        # global state — AuthContext, ThemeContext
├── components/     # reusable UI (Navbar, Button, ProtectedRoute, …)
└── pages/          # route screens (Home, AuctionDetail, Sell, Profile, Admin, …)
```

---

## Setup

> Requires **Node v20.19+ / v22.12+**. **The backend must be running** (default `http://localhost:8000`) for the app to work — start it first (see [`backend/README.md`](../backend/README.md)).

```bash
# from the frontend/ folder
npm install

# (optional) override the API/socket URLs — defaults already point at localhost:8000
cp .env.sample .env        # PowerShell: Copy-Item .env.sample .env

# start the dev server
npm run dev
```

Then open **http://localhost:5173**.

---

## Environment variables (`.env`) — optional

Only `VITE_`-prefixed vars are exposed to the app (they're public — never put secrets here). Both default to localhost, so you can skip this file for local dev.

| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend REST base URL | `http://localhost:8000/api/v1` |
| `VITE_SOCKET_URL` | Backend Socket.io URL | `http://localhost:8000` |

> If you change the backend port, update these **and** the backend's `CORS_ORIGIN`, or requests will be blocked by CORS.

---

## Scripts

| Command | Does |
|---------|------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |

---

## Notes

- The access token is kept in `localStorage`; the refresh token lives in an httpOnly cookie set by the API (so `withCredentials` is on for all requests).
- All server calls go through the **service layer** in `src/api/` — components never call `axios`/`fetch` directly.
- Theming uses **semantic Tailwind tokens** (`bg-surface`, `text-ink`, …); dark mode just re-points those tokens, so the whole app flips with one class on `<html>`.
