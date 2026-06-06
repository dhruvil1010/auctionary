# 🔨 Auctionary — Real-Time Online Auction Platform

A full-stack **MERN + Socket.io** auction marketplace where people list items and bid on them **live**. Inspired by Catawiki, Auctionary lets sellers put up collectibles, art, watches, furniture and more, while buyers compete in **real time** — every bid, outbid and win updates instantly across all connected viewers, no refresh needed.

> Built as an end-to-end portfolio project: secure JWT auth, race-safe bidding, image uploads, an admin dashboard, dark mode, and a hardened API that passed a 20-point security audit.

---

## 📑 Table of Contents

- [What it does](#-what-it-does)
- [Features](#-features)
- [Tech Stack](#%EF%B8%8F-tech-stack)
- [Screenshots](#-screenshots)
- [Project Structure](#-project-structure)
- [Prerequisites](#-prerequisites)
- [Getting Started (run it locally)](#-getting-started-run-it-locally)
  - [1. Clone the repo](#1-clone-the-repo)
  - [2. Backend — install packages](#2-backend--install-packages)
  - [3. Get your keys & connection strings](#3-get-your-keys--connection-strings)
  - [4. Create the backend `.env`](#4-create-the-backend-env)
  - [5. (Optional) Seed an admin account](#5-optional-seed-an-admin-account)
  - [6. Start the backend](#6-start-the-backend)
  - [7. Frontend — install & run](#7-frontend--install--run)
  - [8. Open the app](#8-open-the-app)
- [Environment Variables Reference](#-environment-variables-reference)
- [Available Scripts](#-available-scripts)
- [API Overview](#-api-overview)
- [Security](#-security)
- [License](#-license)

---

## 🎯 What it does

Auctionary is a two-sided marketplace:

- **Sellers** list an item — title, description, category, a photo, a starting price, an optional **“Buy Now”** price, and an end date/time (up to 10 days out). The auction goes live immediately.
- **Buyers** browse and search listings, open an auction, and **place bids in real time**. Each new bid must beat the current price by at least **5%**, but bidders are free to jump higher. If a seller set a Buy-Now price, a buyer can **purchase instantly** and end the auction on the spot.
- **Live updates** — powered by Socket.io, everyone watching an auction sees new bids the instant they happen, the previous leader gets an **“you’ve been outbid”** notification, and when an auction ends the **winner** is announced live.
- **Auto-close** — a background job watches for auctions past their end time, closes them, and assigns the winner automatically.
- **Admins** moderate the platform through a dashboard (stats, manage users, manage/delete auctions).

---

## ✨ Features

**Authentication & Accounts**
- Register / log in / log out with **JWT** (short-lived access token + httpOnly refresh-token cookie).
- Passwords hashed with **bcrypt**; sessions invalidated on logout via a token-version mechanism.
- Two roles: **user** (can buy *and* sell) and **admin** (moderation + dashboard).

**Auctions**
- Create listings with **image upload** (stored on Cloudinary).
- 14 categories (Art, Watches, Jewellery, Antiques, Collectibles, Coins & Stamps, Classic Cars, Books & Manuscripts, Fashion, Electronics, Musical Instruments, Sports Memorabilia, Furniture, Other).
- Free-form **end date/time** picker (capped at 10 days).
- Optional **Buy-Now** price for instant purchase.
- Browse home feed with **search**, **category / status filters**, and **pagination**.

**Real-Time Bidding**
- Live bid feed per auction via **Socket.io rooms**.
- **5% minimum increment** rule, enforced server-side.
- **Race-safe** bidding using atomic database updates — two simultaneous bids can never both “win”.
- Personal notifications: **outbid**, **auction ended**, **you won**.
- Live **countdown timers**.

**Profiles & Admin**
- Profile page: your **active bids**, **won**, **lost**, and **your listings** (sold / unsold / live / upcoming).
- Admin dashboard: platform stats, user management, auction management.

**Experience**
- 🌙 **Dark / light mode** toggle (whole app re-themes instantly, no flash on reload).
- Clean, responsive UI built with Tailwind CSS.

---

## 🛠️ Tech Stack

### Backend
| Tool | Purpose |
|------|---------|
| **Node.js + Express 5** | REST API server |
| **MongoDB + Mongoose 9** | Database & ODM |
| **Socket.io 4** | Real-time bidding / notifications |
| **jsonwebtoken** | JWT access & refresh tokens |
| **bcryptjs** | Password hashing |
| **Multer 2 + Cloudinary 2** | Image upload & hosting |
| **express-rate-limit** | Brute-force / abuse protection |
| **mongoose-aggregate-paginate-v2** | Paginated queries |
| **cors, cookie-parser, dotenv** | Cross-origin, cookies, env config |

### Frontend
| Tool | Purpose |
|------|---------|
| **React 19** | UI library |
| **Vite 8** | Build tool / dev server |
| **React Router 7** | Client-side routing |
| **Tailwind CSS v4** | Styling (semantic design tokens + dark mode) |
| **Axios** | HTTP client |
| **socket.io-client** | Real-time client |

---

## 📸 Screenshots

> _Add your screenshots here once the app is running — e.g. Home feed, Auction detail (live bidding), Sell page, Profile, Admin dashboard, dark mode._

```
![Home](docs/home.png)
![Auction detail](docs/auction-detail.png)
```

---

## 📁 Project Structure

```
auctionary/
├── backend/                    # Express + MongoDB + Socket.io API
│   ├── src/
│   │   ├── index.js            # entry: validate env → connect DB → start server + sockets + jobs
│   │   ├── app.js              # Express app: middleware, routes, error handler
│   │   ├── constants.js        # enums, limits, categories (single source of truth)
│   │   ├── db/                 # MongoDB connection
│   │   ├── models/             # Mongoose schemas (User, Auction, Bid)
│   │   ├── controllers/        # request handlers (auth, auctions, bids, admin)
│   │   ├── routes/             # URL → controller mapping
│   │   ├── middlewares/        # auth, rate-limit, multer upload, error handler
│   │   ├── utils/              # ApiError/ApiResponse, asyncHandler, validateEnv, cloudinary
│   │   ├── sockets/            # real-time layer (rooms + emit helpers)
│   │   ├── jobs/               # background auction-expiry scanner
│   │   └── seeds/              # seed an admin account
│   ├── .env.sample            # template for your secrets (copy → .env)
│   └── package.json
└── frontend/                   # React + Vite + Tailwind SPA
    ├── src/
    │   ├── api/                # axios instance + service layer (one file per resource)
    │   ├── components/         # reusable UI (Navbar, Button, ProtectedRoute, …)
    │   ├── pages/              # route screens (Home, AuctionDetail, Sell, Profile, Admin, …)
    │   ├── context/            # global state (Auth, Theme)
    │   ├── lib/                # socket factory
    │   └── conf/               # env-driven config
    ├── .env.sample
    └── package.json
```

---

## ✅ Prerequisites

Install these first:

| Requirement | Notes |
|-------------|-------|
| **Node.js** | v20.19+ or v22.12+ (Vite 8 / Express 5 need a modern Node). [Download](https://nodejs.org) |
| **npm** | Comes with Node. |
| **MongoDB** | Either **local** ([Community Server](https://www.mongodb.com/try/download/community) + optional [Compass](https://www.mongodb.com/products/compass) GUI) **or** a free **MongoDB Atlas** cloud cluster. |
| **Cloudinary account** | Free — used for image hosting. [Sign up](https://cloudinary.com/users/register_free). |
| **Git** | To clone the repo. |

---

## 🚀 Getting Started (run it locally)

The app has **two parts** — `backend` and `frontend` — that run **at the same time** in **two separate terminals**.

### 1. Clone the repo

```bash
git clone https://github.com/dhruvil1010/auctionary.git
cd auctionary
```

### 2. Backend — install packages

```bash
cd backend
npm install
```

`npm install` reads `package.json` and installs everything at once (recommended). If you’d rather install **package by package** to understand each one, run:

**Runtime dependencies:**
```bash
npm install express          # web framework / REST API
npm install mongoose         # MongoDB ODM (schemas, queries)
npm install socket.io        # real-time bidding via WebSockets
npm install jsonwebtoken     # JWT access & refresh tokens
npm install bcryptjs         # hash passwords
npm install multer           # parse multipart/form-data (image upload)
npm install cloudinary       # upload & host images
npm install express-rate-limit   # rate limiting
npm install mongoose-aggregate-paginate-v2   # paginated aggregations
npm install cors             # allow the frontend origin
npm install cookie-parser    # read the httpOnly refresh cookie
npm install dotenv           # load .env into process.env
```

**Dev dependencies:**
```bash
npm install -D nodemon       # auto-restart server on file change
npm install -D prettier      # code formatter
```

### 3. Get your keys & connection strings

You need **three** things: a **MongoDB URI**, **JWT secrets**, and **Cloudinary credentials**.

#### 🟢 MongoDB connection string

> The app appends the database name `/auction` automatically — so give the **base URI only** (no trailing slash, no `/dbname`, no `?query` params).

- **Local MongoDB** (easiest): start MongoDB, then use
  ```
  mongodb://127.0.0.1:27017
  ```
- **MongoDB Atlas** (cloud): create a free cluster → **Connect** → **Drivers** → copy the string and strip everything after the host:
  ```
  mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net
  ```
  Also add your IP (or `0.0.0.0/0`) under **Network Access** in Atlas.

#### 🟢 JWT secrets (generate two different strong ones)

These sign your auth tokens. They must be **long and random** (the server refuses to start with weak/short secrets). Generate two:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Run it **twice** and use the two outputs for `ACCESS_TOKEN_SECRET` and `REFRESH_TOKEN_SECRET` (they must be different).

#### 🟢 Cloudinary credentials (image hosting)

1. Create a free account at **[cloudinary.com](https://cloudinary.com/users/register_free)**.
2. Open the **Dashboard** (Programmable Media).
3. Copy these three values:
   - **Cloud Name**
   - **API Key**
   - **API Secret** (click “reveal”)
4. Paste them into your `.env` (next step).

### 4. Create the backend `.env`

In the `backend/` folder, copy the template and fill it in:

```bash
cp .env.sample .env      # Windows PowerShell: Copy-Item .env.sample .env
```

Then edit `backend/.env`:

```env
# ---- Server ----
PORT=8000
CORS_ORIGIN=http://localhost:5173        # the frontend dev URL (Vite default)

# ---- Database ----
MONGODB_URI=mongodb://127.0.0.1:27017    # base URI only — app appends /auction

# ---- JWT auth ----
ACCESS_TOKEN_SECRET=<paste first generated secret>
ACCESS_TOKEN_EXPIRY=1d
REFRESH_TOKEN_SECRET=<paste second generated secret>
REFRESH_TOKEN_EXPIRY=10d

# ---- Cloudinary (image hosting) ----
CLOUDINARY_CLOUD_NAME=<your cloud name>
CLOUDINARY_API_KEY=<your api key>
CLOUDINARY_API_SECRET=<your api secret>

# ---- Admin seed (optional; used by: npm run seed:admin) ----
ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@auction.local
ADMIN_PASSWORD=<choose a strong password>
```

> ⚠️ **Never commit `.env`** — it’s already git-ignored. Only `.env.sample` (with empty values) is tracked.

### 5. (Optional) Seed an admin account

Admins aren’t created through public signup. Set `ADMIN_*` in `.env`, then run:

```bash
npm run seed:admin
```

Log in later with that email + password to access `/admin`.

### 6. Start the backend

```bash
npm run dev      # auto-reloads on changes (nodemon)
# or: npm start  # plain node
```

You should see `✅ MongoDB connected` and `⚙️  Server running at http://localhost:8000`.

### 7. Frontend — install & run

Open a **second terminal**:

```bash
cd frontend
npm install
```

(Manual install equivalent, if you prefer one-by-one:)
```bash
npm install react react-dom          # UI library
npm install react-router-dom         # routing
npm install axios                    # HTTP client
npm install socket.io-client         # real-time client
npm install tailwindcss @tailwindcss/vite   # styling
npm install -D vite @vitejs/plugin-react    # build tooling
npm install -D eslint @eslint/js eslint-plugin-react-hooks eslint-plugin-react-refresh globals @types/react @types/react-dom
```

The frontend env is **optional** (it defaults to `localhost`). To customize, copy the sample:
```bash
cp .env.sample .env      # PowerShell: Copy-Item .env.sample .env
```
```env
VITE_API_URL=http://localhost:8000/api/v1
VITE_SOCKET_URL=http://localhost:8000
```

Then start it:
```bash
npm run dev
```

### 8. Open the app

Visit **http://localhost:5173** 🎉

Register an account, list an item, open it in a second browser/incognito window, and watch bids update live.

---

## ⚠️ Assumptions & Notes

Read these before reporting an issue — they cover the most common setup snags:

- **Two terminals run at once** — the backend (`:8000`) and the frontend (`:5173`) are separate processes; start both.
- **MongoDB must be running and reachable before you start the backend.** The server intentionally **exits** if it can't connect. For local Mongo, make sure the service is started; for Atlas, whitelist your IP under **Network Access**.
- **Cloudinary is required to create listings.** Listing an item uploads an image, so valid Cloudinary credentials are needed for that flow. Browsing, auth, and bidding work without it, but you can't create an auction until it's set.
- **`MONGODB_URI` must be the base URI only** — no trailing slash, database name, or `?query` string. The app appends the database name `/auction` itself.
- **JWT secrets must be ≥ 32 characters and different from each other**, or the server refuses to boot (this is a deliberate safety check, not a bug).
- **Run each part from its own folder** — backend commands from `backend/`, frontend from `frontend/`. (The temporary upload path `public/temp` is resolved relative to `backend/`.)
- **Default ports are 8000 (API) and 5173 (frontend).** If you change either, update `CORS_ORIGIN` (backend `.env`) and `VITE_API_URL` / `VITE_SOCKET_URL` (frontend `.env`) to match, or requests will be blocked by CORS.
- **Node version matters** — use **v20.19+ or v22.12+**. Older Node will fail to run Vite 8 / Express 5.
- **Admins aren't created by signup.** Use `npm run seed:admin` (with the `ADMIN_*` vars set) to create one.
- **First run creates the database automatically** — MongoDB makes the `auction` database and its collections on first write; no manual DB setup needed.
- **Cloning** creates a folder named `auctionary` (the repo name); all commands below assume you're inside it.

---

## 🔑 Environment Variables Reference

### Backend (`backend/.env`)
| Variable | Required | Description | How to get it |
|----------|----------|-------------|---------------|
| `PORT` | no | API port (default `8000`) | choose any free port |
| `CORS_ORIGIN` | ✅ | Frontend URL allowed to call the API | `http://localhost:5173` for local dev |
| `MONGODB_URI` | ✅ | Base MongoDB URI (app appends `/auction`) | local `mongodb://127.0.0.1:27017` or Atlas string |
| `ACCESS_TOKEN_SECRET` | ✅ | Signs access tokens (≥32 chars) | `node -e "..."` generator above |
| `ACCESS_TOKEN_EXPIRY` | ✅ | Access token lifetime | e.g. `1d` |
| `REFRESH_TOKEN_SECRET` | ✅ | Signs refresh tokens (must differ from access) | generator above |
| `REFRESH_TOKEN_EXPIRY` | ✅ | Refresh token lifetime | e.g. `10d` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret | Cloudinary dashboard |
| `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | optional | Used only by `npm run seed:admin` | you choose |

### Frontend (`frontend/.env`) — optional
| Variable | Description | Default |
|----------|-------------|---------|
| `VITE_API_URL` | Backend REST base URL | `http://localhost:8000/api/v1` |
| `VITE_SOCKET_URL` | Backend Socket.io URL | `http://localhost:8000` |

---

## 📜 Available Scripts

### Backend
| Command | Does |
|---------|------|
| `npm run dev` | Start API with auto-reload (nodemon) |
| `npm start` | Start API (plain node) |
| `npm run seed:admin` | Create/promote an admin account from `.env` |
| `npm run format` | Format code with Prettier |

### Frontend
| Command | Does |
|---------|------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |

---

## 🔌 API Overview

Base path: `http://localhost:8000/api/v1`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/users/register` | — | Create an account |
| `POST` | `/users/login` | — | Log in (returns access token; sets refresh cookie) |
| `POST` | `/users/logout` | ✅ | Log out (invalidates session) |
| `POST` | `/users/refresh-token` | cookie | Get a new access token |
| `GET`  | `/users/current-user` | ✅ | Current logged-in user |
| `GET`  | `/users/profile` | ✅ | Your bids, wins, losses & listings |
| `GET`  | `/auctions` | — | List auctions (search, filters, pagination) |
| `POST` | `/auctions` | ✅ | Create an auction (multipart image upload) |
| `GET`  | `/auctions/my` | ✅ | The logged-in seller's own auctions |
| `GET`  | `/auctions/:id` | — | Auction details |
| `POST` | `/bids` | ✅ | Place a bid |
| `POST` | `/bids/buyout` | ✅ | Buy now (instant win) |
| `GET`  | `/bids/:auctionId` | — | Bid history for an auction |
| `GET`  | `/admin/stats` | ✅ admin | Dashboard stats |
| `GET`  | `/admin/users` | ✅ admin | List users |
| `DELETE` | `/admin/users/:id` | ✅ admin | Delete a user |
| `GET`  | `/admin/auctions` | ✅ admin | List all auctions |
| `DELETE` | `/admin/auctions/:id` | ✅ admin | Delete an auction |

> **Real-time events (Socket.io):** the client emits `auction:join` / `auction:leave`; the server emits `bid:new`, `auction:outbid`, `auction:ended`, `auction:won`, `auction:participants` (live viewer count) and `auction:started`.

---

## 🔒 Security

This project was hardened against a 20-point checklist, including:
- Fail-closed env validation (server won’t boot with missing/weak secrets).
- Per-IP rate limiting (stricter on auth routes).
- httpOnly + SameSite refresh-token cookie (XSS can’t steal it).
- bcrypt password hashing + token-version logout invalidation.
- Strict numeric validation (`Number.isFinite` + upper bounds) on all money fields.
- Regex/NoSQL-injection escaping on search & filters.
- Atomic, race-safe bid updates.
- Clamped pagination, central error handling, CORS allow-list, capped request bodies.

> Secrets live only in `.env` (git-ignored). If you deploy, set them as host environment variables and rotate any that were ever shared.

---

## 📝 License

Released under the **MIT License** — see [LICENSE](LICENSE). Free to use, modify, and share, for learning or commercial purposes, as long as the copyright notice is kept.

---

<p align="center">Built with ☕ and the MERN stack by <a href="https://github.com/dhruvil1010">@dhruvil1010</a></p>
