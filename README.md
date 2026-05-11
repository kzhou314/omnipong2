# omnipong2

Baseline web app for ping pong / table tennis tournament organization (inspired by the structure of omnipong.com: activities list, player vs director flows, member/director access entry points).

Accounts are stored in a **SQLite** database at `data/omnipong.db` (created on first API start). The API hashes passwords with **bcrypt** and issues **JWT** sessions in an **httpOnly** cookie (`omnipong_token`).

## Scripts

- `npm install` — install dependencies
- `npm run dev` — runs **Vite** (frontend) and the **Express API** together; `/api` is proxied to port `3001`
- `npm run dev:web` — frontend only
- `npm run dev:api` — API only (`tsx watch server/index.ts`)
- `npm run build` — production build of the SPA to `dist/`
- `npm run preview` — preview the SPA (set `CORS_ORIGIN` to match the preview URL if you also run the API)
- `npm run start:api` — run the API once (e.g. behind a reverse proxy after `npm run build`)
- `npm run lint` — ESLint

Copy `.env.example` to `.env` and set `JWT_SECRET` before deploying.

Demo tournament rows live in `src/data/tournaments.ts`.
