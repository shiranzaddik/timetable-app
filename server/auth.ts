// Google OAuth login with a Gmail-address whitelist.
// Verifies the ID token from Google Identity Services, then issues a signed
// session JWT in an HttpOnly cookie. No database — sessions are self-contained.
//
// Auth is enabled when GOOGLE_CLIENT_ID is set. If unset, the middleware lets
// everything through (handy for local dev before Google credentials are set up).
//
// Env vars:
//   GOOGLE_CLIENT_ID  — OAuth Client ID from Google Cloud Console
//   ALLOWED_EMAILS    — comma-separated list of permitted Gmail addresses
//                       (empty/unset = anyone with a Google account can sign in)
//   SESSION_SECRET    — random string used to sign session JWTs
//   NODE_ENV          — set to "production" for secure-only cookies

import { OAuth2Client } from "google-auth-library";
import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? "";
const SESSION_SECRET =
  process.env.SESSION_SECRET ?? "dev-only-secret-set-SESSION_SECRET-in-production";
const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const authEnabled = CLIENT_ID.length > 0;

const oauthClient = authEnabled ? new OAuth2Client(CLIENT_ID) : null;

const COOKIE_NAME = "session";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface SessionUser {
  email: string;
  name: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<SessionUser> {
  if (!oauthClient) throw new Error("Google auth is not configured on the server.");
  const ticket = await oauthClient.verifyIdToken({
    idToken,
    audience: CLIENT_ID,
  });
  const payload = ticket.getPayload();
  if (!payload?.email || payload.email_verified === false) {
    throw new Error("Google did not return a verified email.");
  }
  const email = payload.email.toLowerCase();
  if (ALLOWED_EMAILS.length > 0 && !ALLOWED_EMAILS.includes(email)) {
    throw new Error("This Google account is not authorized to use this app.");
  }
  return { email, name: payload.name ?? email };
}

export function signSession(user: SessionUser): string {
  return jwt.sign(user, SESSION_SECRET, { expiresIn: "30d" });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/",
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

export function readSession(req: Request): SessionUser | null {
  const token = (req as Request & { cookies?: Record<string, string> }).cookies?.[
    COOKIE_NAME
  ];
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, SESSION_SECRET) as jwt.JwtPayload & SessionUser;
    if (!decoded.email) return null;
    return { email: decoded.email, name: decoded.name };
  } catch {
    return null;
  }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!authEnabled) return next();
  const user = readSession(req);
  if (!user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  (req as Request & { user?: SessionUser }).user = user;
  next();
}
