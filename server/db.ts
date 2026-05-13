// Postgres persistence for users + their saved school configurations.
// Disabled automatically when DATABASE_URL is not set (for local dev without a db).

import pg from "pg";
import type { SchoolInput } from "./types.js";

const DATABASE_URL = process.env.DATABASE_URL ?? "";
export const dbEnabled = DATABASE_URL.length > 0;

const pool = dbEnabled
  ? new pg.Pool({
      connectionString: DATABASE_URL,
      // Neon (and most managed Postgres) require TLS.
      ssl: { rejectUnauthorized: false },
      max: 5,
    })
  : null;

/** Create tables if they don't exist yet. Idempotent — safe to call on every boot. */
export async function initSchema(): Promise<void> {
  if (!pool) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      email      TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schools (
      email      TEXT PRIMARY KEY REFERENCES users(email) ON DELETE CASCADE,
      config     JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

export async function upsertUser(email: string, name: string): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO users(email, name) VALUES ($1, $2)
     ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name`,
    [email, name]
  );
}

export async function getSchool(email: string): Promise<SchoolInput | null> {
  if (!pool) return null;
  const { rows } = await pool.query<{ config: SchoolInput }>(
    `SELECT config FROM schools WHERE email = $1`,
    [email]
  );
  return rows[0]?.config ?? null;
}

export async function saveSchool(email: string, config: SchoolInput): Promise<void> {
  if (!pool) return;
  await pool.query(
    `INSERT INTO schools(email, config, updated_at) VALUES ($1, $2::jsonb, now())
     ON CONFLICT (email) DO UPDATE SET config = EXCLUDED.config, updated_at = now()`,
    [email, JSON.stringify(config)]
  );
}

export async function deleteSchool(email: string): Promise<void> {
  if (!pool) return;
  await pool.query(`DELETE FROM schools WHERE email = $1`, [email]);
}
