# Deploying to Render

The whole app runs as one Node service: Express serves the API **and** the React build from the same process.

## Steps

1. **Sign in** at <https://dashboard.render.com> with your GitHub account.
2. **New +** → **Web Service** → connect the repo `shiranzaddik/timetable-app`.
3. Use these settings:

   | Field | Value |
   | --- | --- |
   | Environment | `Node` |
   | Region | any |
   | Branch | `main` |
   | Build command | `npm run build` |
   | Start command | `npm start` |
   | Instance type | `Free` |

4. Click **Create Web Service**.

The first build takes 1-2 minutes. After it's live you'll get a URL like
`https://timetable-app-xxxx.onrender.com`.

## How the build works

- `npm run build` (root `package.json`) → installs root, server, and client deps; builds the client to `client/dist/`.
- `npm start` → runs the server with `tsx`, which detects `client/dist/` and serves it as static files (with an SPA fallback so refreshes still load the page).
- `/api/demo` and `/api/solve` keep working as before.

## Notes

- The free tier sleeps after 15 min of inactivity; the first request after a sleep takes ~30 s to wake up.
- No database, no environment secrets — the app is fully stateless.
- Bumping Node version: Render reads `engines.node` from the root `package.json` (currently `>=20`).
