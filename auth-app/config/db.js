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

  // A `head: true` select with count does not download any rows, it just
  // confirms the table is reachable.
  for (const table of Object.values(TABLES)) {
    const { error } = await db.from(table).select("*", { count: "exact", head: true });
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

module.exports = { getDb, isDbConfigured, checkSchema, TABLES };
