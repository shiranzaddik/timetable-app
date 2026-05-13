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
- No database — the app is fully stateless.
- Bumping Node version: Render reads `engines.node` from the root `package.json` (currently `>=20`).

## Google sign-in (optional)

The app supports "Sign in with Google" with a Gmail-address whitelist. Auth is **disabled** by default; enable it by setting these environment variables on Render (Service → Environment → Add Environment Variable):

| Key | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth Client ID from Google Cloud Console (server side) |
| `VITE_GOOGLE_CLIENT_ID` | Same value as `GOOGLE_CLIENT_ID` (client side, injected at build) |
| `ALLOWED_EMAILS` | Comma-separated Gmail addresses, e.g. `you@gmail.com,colleague@gmail.com` |
| `SESSION_SECRET` | Random string. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |

### Creating the OAuth Client ID

1. Go to https://console.cloud.google.com/apis/credentials (create a project if you don't have one).
2. **Create Credentials** → **OAuth client ID** → **Web application**.
3. Add **Authorized JavaScript origins**:
   - `http://localhost:5173`
   - `https://timetable-app-ddec.onrender.com` (your Render URL)
4. Click **Create**. Copy the **Client ID** — that's the value for both `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID`.

After setting the variables on Render, click **Manual Deploy → Deploy latest commit** so the new build picks up `VITE_GOOGLE_CLIENT_ID`. Users will see the *Sign in with Google* screen until they sign in with an email in `ALLOWED_EMAILS`.

## Per-user persistence (optional)

Adds the ability for each signed-in user to **save their school configuration**
(teachers + classes) so it survives page reloads. Without it, the app falls
back to the in-memory demo every refresh.

| Key | Value |
| --- | --- |
| `DATABASE_URL` | Postgres connection string from Neon, Supabase, or any other Postgres host. Example: `postgresql://user:pass@host/db?sslmode=require` |

The server bootstraps the schema (`users` + `schools` tables) on every boot
— no migrations to run. When `DATABASE_URL` is empty, persistence silently
turns off and the *Save my data* button is hidden.
