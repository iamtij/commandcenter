# TJ Command Center

Private, read-only dashboard for TJ: today's Google Calendar meetings and open GitHub pull requests across OLINN, Fullhouse, and Eventix — mobile-first, big-picture first.

## Features

- Google OAuth (allowlisted email only)
- Google Calendar primary calendar (today + 7 days) using the signed-in user's token
- Open PRs from `iamtij/olin`, `iamtij/fullhouseph`, and `iamtij/eventixph` via server-side GitHub token
- ~5 minute server cache with manual **Refresh**
- `/health` for Railway health checks

## Environment variables

Copy `.env.example` and set:

| Variable | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_REDIRECT_URI` | OAuth redirect URL (e.g. `https://your-app.up.railway.app/auth/google/callback`) |
| `SESSION_SECRET` | Random string **at least 32 characters** for signing the session cookie |
| `SESSION_STORE_PATH` | Optional. Directory for production session files (default `./data/sessions`) |
| `ALLOWED_EMAIL` | Only this Google account may sign in |
| `GITHUB_TOKEN` | Fine-grained or classic token with read access to the three repos |
| `PORT` | HTTP port (Railway sets this automatically) |

Never commit secrets. Tokens are only used on the server and are not included in HTML or JSON responses.

## Local development

```bash
npm install
cp .env.example .env
# fill in .env
npm run dev
```

Open `http://localhost:3000` (or your `PORT`).

## Railway deployment

1. Create a new **private** GitHub repo and connect it to Railway (or deploy from this repo).
2. Add a **Web Service** from the repo.
3. Railway detects the `Dockerfile` (or use Nixpacks with `npm start` after `npm run build`).
4. Set all env vars from the table above in Railway **Variables**.
5. In [Google Cloud Console](https://console.cloud.google.com/), create an OAuth client (Web application):
   - Authorized redirect URI: `https://<your-railway-domain>/auth/google/callback`
   - Enable the Google Calendar API for the project.
6. Set `GOOGLE_REDIRECT_URI` to match that callback URL exactly.
7. Configure Railway health check path: `/health`.
8. Deploy. Sign in with the Google account matching `ALLOWED_EMAIL`.

## Scripts

- `npm run dev` — local dev server with reload
- `npm run lint` — ESLint
- `npm run typecheck` — TypeScript
- `npm test` — Vitest
- `npm run build` / `npm start` — production

## Security

- Session cookie: `httpOnly`, `secure` in production, `sameSite=lax`, signed with `SESSION_SECRET`
- **Production sessions** use `session-file-store` (files under `SESSION_STORE_PATH`, encrypted with `SESSION_SECRET`) so sessions survive process restarts without Redis or another database. Development and tests use the in-memory store.
- Google OAuth uses a cryptographically random `state` parameter (single-use, timing-safe verification).
- Login requires a **verified** Google email and calls `req.session.regenerate()` after success (session fixation mitigation).
- Headers: `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex`, `Content-Security-Policy` (`default-src 'self'; script-src 'none'; style-src 'self'; frame-ancestors 'none'`), and `Strict-Transport-Security` in production.
- Read-only: no write actions to Calendar, GitHub, or any other source
