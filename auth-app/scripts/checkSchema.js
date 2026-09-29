/**
 * scripts/checkSchema.js
 * ------------------------------------------------------------------
 * Standalone database check, so you can confirm the tables exist WITHOUT
 * starting the web server.
 *
 * Usage:  npm run check
 *
 * Run supabase/schema.sql in the Supabase SQL Editor first if this reports
 * missing tables - the REST API cannot create tables on its own.
 */

"use strict";

require("dotenv").config();
const { isDbConfigured, checkSchema } = require("../config/db");

(async () => {
  if (!isDbConfigured()) {
    console.error("[X] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing.");
    console.error("    Copy .env.example to .env and fill them in.");
    process.exit(1);
  }

  console.log("Checking Supabase schema ...");

  const result = await checkSchema();

  if (result.ok) {
    console.log("[OK]", result.message);
    process.exit(0);
  }

  console.error("[!]", result.message);
  process.exit(1);
})();
