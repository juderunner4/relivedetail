# Relive Mobile Detailing — Owner Dashboard

Express + SQLite backend, React + Vite frontend, deployed to Railway.

## Stack
- Backend: Node.js, Express, better-sqlite3
- Frontend: React 19, React Router 7, Recharts, Tailwind CSS, Vite
- Auth: JWT (HS256), bcrypt
- Hosting: Railway (backend + serve client dist), Vercel (public marketing site)

## Key paths
- Server entry: `server/index.js`
- Client entry: `client/src/main.jsx`
- DB init: `server/db.js`
- Routes: `server/routes/`
- Pages: `client/src/pages/dashboard/`
