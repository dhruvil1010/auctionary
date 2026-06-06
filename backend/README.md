# Auctionary — Backend (REST API + Real-Time)

The server for **Auctionary**, a real-time auction platform. It exposes a JSON REST API and a Socket.io real-time layer on the same port. Built with **Express 5, MongoDB/Mongoose, and Socket.io**.

> This is the API only. For the full project overview, the React client, and screenshots, see the [root README](../README.md).

---

## What it handles

- **Auth** — register / login / logout / refresh with JWT (access token + httpOnly refresh cookie), bcrypt password hashing, and token-version logout invalidation.
- **Auctions** — create (with Cloudinary image upload), browse/search/filter with pagination, fetch one, list a seller's own.
- **Bidding** — place bids with a server-enforced 5% minimum increment, **race-safe** atomic updates, and instant **buy-now**.
- **Real-time** — Socket.io rooms broadcast new bids, outbid/won notifications, and live viewer counts.
- **Admin** — dashboard stats, user & auction management (role-gated).
- **Background job** — auto-closes auctions past their end time and assigns the winner.

---

## Tech stack

| Tool | Purpose |
|------|---------|
| Express 5 | HTTP / REST framework |
| Mongoose 9 (MongoDB) | Data models & queries |
| Socket.io 4 | Real-time events |
| jsonwebtoken | JWT auth |
| bcryptjs | Password hashing |
| Multer 2 + Cloudinary 2 | Image upload & hosting |
| express-rate-limit | Rate limiting |
| mongoose-aggregate-paginate-v2 | Pagination |
| cors, cookie-parser, dotenv | Cross-origin, cookies, config |

---

## Folder structure

```
src/
├── index.js          # entry: validate env → connect DB → start HTTP + Socket.io + jobs
├── app.js            # Express app: middleware, routes, central error handler
├── constants.js      # enums, limits, categories (single source of truth)
├── db/               # MongoDB connection
├── models/           # User, Auction, Bid schemas
├── controllers/      # request handlers (auth, auctions, bids, admin)
├── routes/           # URL → controller mapping
├── middlewares/      # auth, rate-limit, multer upload, error handler
├── utils/            # ApiError/ApiResponse, asyncHandler, validateEnv, cloudinary
├── sockets/          # real-time layer (rooms + emit helpers)
├── jobs/             # auction-expiry scanner
└── seeds/            # seed an admin account
```

---

## Setup

> Requires **Node v20.19+ / v22.12+**, a **MongoDB** instance (local or Atlas), and a free **Cloudinary** account. MongoDB must be running before you start the server (the process exits if it can't connect).

```bash
# from the backend/ folder
npm install

# create your env file and fill it in (see table below)
cp .env.sample .env        # PowerShell: Copy-Item .env.sample .env

# generate two strong, different JWT secrets:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# (optional) create an admin account from the ADMIN_* vars
npm run seed:admin

# start the API (auto-reload)
npm run dev
```

You should see `✅ MongoDB connected` and `⚙️  Server running at http://localhost:8000`.

---

## Environment variables (`.env`)

| Variable | Required | Description | How to get it |
|----------|----------|-------------|---------------|
| `PORT` | no | API port (default `8000`) | any free port |
| `CORS_ORIGIN` | ✅ | Frontend URL allowed to call the API | `http://localhost:5173` for local dev |
| `MONGODB_URI` | ✅ | **Base** Mongo URI — app appends `/auction` | local `mongodb://127.0.0.1:27017` or an Atlas string (no trailing slash / db / query) |
| `ACCESS_TOKEN_SECRET` | ✅ | Signs access tokens (**≥32 chars**) | the generator command above |
| `ACCESS_TOKEN_EXPIRY` | ✅ | Access token lifetime | e.g. `1d` |
| `REFRESH_TOKEN_SECRET` | ✅ | Signs refresh tokens (**must differ** from access) | the generator command above |
| `REFRESH_TOKEN_EXPIRY` | ✅ | Refresh token lifetime | e.g. `10d` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | Cloudinary cloud name | Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | ✅ | Cloudinary API key | Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | ✅ | Cloudinary API secret | Cloudinary dashboard |
| `ADMIN_USERNAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | optional | Used only by `npm run seed:admin` | you choose |

> The server **refuses to start** if any required var is missing, a JWT secret is shorter than 32 chars, or the two secrets are identical — by design.

---

## Scripts

| Command | Does |
|---------|------|
| `npm run dev` | Start with auto-reload (nodemon) |
| `npm start` | Start with plain node |
| `npm run seed:admin` | Create/promote an admin from `.env` |
| `npm run format` | Format with Prettier |

---

## API reference

Base path: `http://localhost:8000/api/v1`

### Auth — `/users`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/register` | — | Create an account |
| `POST` | `/login` | — | Log in (returns access token, sets refresh cookie) |
| `POST` | `/refresh-token` | cookie | Issue a new access token |
| `POST` | `/logout` | ✅ | Log out (invalidates the session) |
| `GET`  | `/current-user` | ✅ | The logged-in user |
| `GET`  | `/profile` | ✅ | Your bids, wins, losses & listings |

### Auctions — `/auctions`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET`  | `/` | — | List/browse (search, filters, pagination) |
| `POST` | `/` | ✅ | Create (multipart form, `image` file field) |
| `GET`  | `/my` | ✅ | The seller's own auctions |
| `GET`  | `/:id` | — | Single auction details |

### Bids — `/bids`
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/` | ✅ | Place a bid |
| `POST` | `/buyout` | ✅ | Buy now (instant win) |
| `GET`  | `/:auctionId` | — | Bid history |

### Admin — `/admin` (all require an admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/stats` | Dashboard stats |
| `GET`  | `/users` | List users |
| `DELETE` | `/users/:id` | Delete a user |
| `GET`  | `/auctions` | List all auctions |
| `DELETE` | `/auctions/:id` | Delete an auction |

### Socket.io events
- **Client → server:** `auction:join`, `auction:leave`
- **Server → clients:** `bid:new`, `auction:outbid`, `auction:ended`, `auction:won`, `auction:participants`, `auction:started`

Connect with the access token in the handshake (`auth.token`) to receive personal `auction:outbid` / `auction:won` events.

---

## Notes

- Uploaded images are stored briefly in `public/temp/` (kept in git via `.gitkeep`), pushed to Cloudinary, then deleted. Image uploads are capped at **5 MB** and must be image types.
- Responses follow one shape: `{ statusCode, data, message, success }`; errors are `{ success:false, message, errors }`.
- `.env` is git-ignored — never commit real secrets. Only `.env.sample` is tracked.
