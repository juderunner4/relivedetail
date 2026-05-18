# Relive Mobile Detailing — Owner Dashboard

Backend API + owner dashboard for Relive Mobile Detailing, Lynchburg VA.

## Setup

### 1. Server

```bash
cd server
cp .env.example .env        # fill in JWT_SECRET and Gmail credentials
npm install
node index.js               # starts on http://localhost:4000
```

Default login password: **relive2024** (change in dashboard → Settings)

### 2. Dashboard (development)

```bash
cd client
npm install
npm run dev                 # opens http://localhost:5173/dashboard/
```

### 3. Dashboard (production build)

```bash
cd client
npm run build               # outputs to client/dist/
```

Then `node server/index.js` — the server serves the built dashboard at `http://localhost:4000/dashboard/`.

---

## Environment Variables (`server/.env`)

| Variable | Description |
|---|---|
| `PORT` | Server port (default 4000) |
| `JWT_SECRET` | Secret for signing login tokens — **change this** |
| `OWNER_PASSWORD` | Initial login password (hashed on first start) |
| `GMAIL_USER` | Gmail address for sending emails |
| `GMAIL_APP_PASSWORD` | Gmail App Password (not your regular password) |
| `OWNER_EMAIL` | Where booking notifications are sent |

### Gmail App Password

1. Go to [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords)
2. Create a new app password for "Mail"
3. Paste it into `GMAIL_APP_PASSWORD`

---

## Deploy to Railway

1. Push repo to GitHub
2. Create new Railway project → "Deploy from GitHub repo"
3. Add a service for the server folder: set **Root Directory** to `server`
4. Add environment variables in Railway dashboard
5. Build the client locally (`npm run build` in `client/`) and commit the `dist/` folder (or set up a separate static deploy)

## Deploy to Render

1. Create a new **Web Service** pointing to your repo
2. Set **Root Directory** to `server`, **Build Command** to `npm install`, **Start Command** to `node index.js`
3. Add environment variables
4. For the dashboard, create a separate **Static Site** service pointing to `client/` with build command `npm run build` and publish directory `dist`

---

## Database

SQLite file at `server/relive.db`. Auto-created on first run with seed data:

- **Client:** Roger Martin — (434) 818-3278 — 225 Peach Tree Ln, Lynchburg VA
- **Vehicles:** 2023 Mazda SUV (wife's), Ford Taurus SHO
- **Booking:** Full Interior & Exterior Detail + Ceramic Wax, both vehicles — May 19 2026 at 3:30 PM — $300 confirmed

Back up `relive.db` regularly.
