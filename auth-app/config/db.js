/**
 * config/db.js
 * ------------------------------------------------------------------
 * Database connection layer.
 *
 * NOTE (important): this project uses Supabase **Postgres**, not MongoDB,
 * so Mongoose is not used. Mongoose can only talk to MongoDB and has no
 * Postgres driver at all. Instead we use the official Supabase JS client
 * (`@supabase/supabase-js`) which talks to Postgres over Supabase's REST API.
 *
 * SECURITY: we use the SERVICE ROLE key here. That key bypasses Postgres
 * Row Level Security, which means this file must NEVER be imported by any
 * client-side code. Everything under /public is plain static HTML/JS and
 * never gets the key - the browser only ever talks to our own /api routes.
 *
 * Tables used (deliberately namespaced so we never touch the existing
 * MeraGhar `users` / `profiles` tables in the same Supabase project):
 *   - auth_users     -> account + credentials
 *   - auth_profiles  -> public profile details, linked 1-to-1
 */

"use strict";

const { createClient } = require("@supabase/supabase-js");

// Table names live in one place so a rename can never half-happen.
const TABLES = {
  users: "auth_users",
  profiles: "auth_profiles",
};

/**
 * Returns the Supabase service-role client, or null when the environment is
 * not configured. Returning null (instead of throwing) lets the server boot and
 * show a friendly "setup needed" page instead of crashing on start.
 */
function getDb() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: {
      // We manage our own sessions with JWT + cookies, so we never want the
      // Supabase client to persist or auto-refresh anything behind our back.
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/** True when the required env vars are present. */
function isDbConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

/**
 * An error we can explain to the user, instead of a raw PostgREST code.
 * server.js turns these into a proper HTTP response.
 */
class DatabaseError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "DatabaseError";
    this.code = code;
  }
}

/**
 * Translates a Supabase/PostgREST error into something a human can act on.
 *
 * Without this, a signup against a project whose tables were never created
 * returns a bare "Kuch galat ho gaya", which sends people hunting through
 * their own code for a bug that is really a missing setup step.
 *
 * @param {{code?:string, message:string, hint?:string|null}|null} error
 * @returns {DatabaseError}
 */
function toDatabaseError(error) {
  const message = error?.message || "Unknown database error.";

  // PGRST205 = "Could not find the table ... in the schema cache", i.e. the
  // schema.sql has not been run in the SQL Editor yet.
  if (error?.code === "PGRST205" || /schema cache/i.test(message)) {
    return new DatabaseError(
      "SCHEMA_MISSING",
      "Database tables abhi bane nahi hain. Supabase SQL Editor me supabase/schema.sql paste karke Run karein, phir server restart karein."
    );
  }

  // 42P01 is the Postgres-level "relation does not exist".
  if (error?.code === "42P01") {
    return new DatabaseError("SCHEMA_MISSING", "Database table nahi mili. supabase/schema.sql run karein.");
  }

  // 42501 = permission denied, e.g. a wrong or publishable key in .env.
  if (error?.code === "42501" || /row-level security|permission denied/i.test(message)) {
    return new DatabaseError(
      "DB_PERMISSION",
      "Database access nahi mila. .env me sahi SUPABASE_SERVICE_ROLE_KEY daali hai ya nahi check karein."
    );
  }

  return new DatabaseError("DB_ERROR", message);
}

/**
 * Guard used before any query. Lets the server answer with a clear setup
 * message instead of crashing with "Cannot read properties of null".
 */
function requireDb() {
  const db = getDb();
  if (!db) {
    throw new DatabaseError(
      "DB_MISSING",
      "Database configured nahi hai. .env.example ko .env me copy karke SUPABASE_URL aur SUPABASE_SERVICE_ROLE_KEY daalein."
    );
  }
  return db;
}

/**
 * Verifies that both tables exist and are visible to PostgREST.
 *
 * Supabase's REST API can read and write data but CANNOT run DDL, so the
 * tables have to be created once by pasting supabase/schema.sql into the
 * Supabase SQL Editor. This function lets the server detect that clearly and
 * print exact instructions instead of failing later with a confusing error.
 *
 * @returns {Promise<{ok: boolean, missing: string[], message: string}>}
 */
async function checkSchema() {
  const db = getDb();

  if (!db) {
    return {
      ok: false,
      missing: [],
      message:
        "Database not configured. Copy .env.example to .env and fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  const missing = [];

  // IMPORTANT: this must be a real row select, NOT `head: true`.
  // With `head: true` PostgREST swallows the "table not found" error and just
  // returns `count: null`, which would make this check report OK for a table
  // that does not exist. A `limit(1)` select surfaces PGRST205 properly.
  for (const table of Object.values(TABLES)) {
    const { error } = await db.from(table).select("*").limit(1);
    // PGRST205 = "table not found in the schema cache"
    if (error) missing.push(table);
  }

  if (missing.length > 0) {
    return {
      ok: false,
      missing,
      message:
        `Database tables missing: ${missing.join(", ")}. ` +
        "Open supabase/schema.sql, paste it into the Supabase SQL Editor and press Run, then restart the server.",
    };
  }

  return { ok: true, missing: [], message: "Database schema is ready." };
}

module.exports = {
  getDb,
  isDbConfigured,
  checkSchema,
  toDatabaseError,
  requireDb,
  DatabaseError,
  TABLES,
};
