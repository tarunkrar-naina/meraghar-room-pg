/**
 * server.js
 * ------------------------------------------------------------------
 * MeraGhar - Authentication & User Profile server.
 *
 * Stack:
 *   Backend  : Node.js + Express
 *   Database : Supabase (Postgres) via @supabase/supabase-js
 *   Auth     : JWT in an httpOnly cookie + bcrypt password hashing
 *   Frontend : plain HTML / CSS / vanilla JS from /public
 *
 * NOTE on Mongoose: the original brief asked for MongoDB + Mongoose. Mongoose
 * is a MongoDB-only ODM - it has no Postgres driver and cannot connect to
 * Supabase at all - and no MongoDB is reachable from this machine. This server
 * therefore uses Supabase Postgres, keeping every security feature intact.
 * See README.md for details.
 *
 * Start:  npm start      (production)
 *         npm run dev    (auto-restart on file changes)
 */

"use strict";

// Loads .env into process.env. Must run before anything reads env vars.
require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");
const cookieParser = require("cookie-parser");
const multer = require("multer");

const { isDbConfigured, checkSchema } = require("./config/db");

const authRoutes = require("./routes/auth");
const profileRoutes = require("./routes/profile");

const app = express();
const PORT = Number(process.env.PORT) || 4000;

// Behind a reverse proxy (Vercel/Render/nginx) rate limiting needs the real
// client IP from X-Forwarded-For. `1` trusts exactly one proxy hop.
app.set("trust proxy", 1);

/* ------------------------------------------------------------------ */
/* Security headers                                                    */
/* ------------------------------------------------------------------ */
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],            // no inline scripts anywhere
        styleSrc: ["'self'"],             // no inline <style> or style="" attrs
        imgSrc: ["'self'", "data:", "blob:"], // data:/blob: for avatar previews
        connectSrc: ["'self'"],           // the frontend only calls our own API
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: null,    // keep working on plain http://localhost
      },
    },
    // Disabling COEP avoids the browser blocking our own images in dev.
    crossOriginEmbedderPolicy: false,
    // Lets the page be loaded from a different origin only via CORS below.
    crossOriginResourcePolicy: { policy: "same-site" },
  })
);

/* ------------------------------------------------------------------ */
/* CORS                                                                */
/* ------------------------------------------------------------------ */
/**
 * The frontend is served by this same server, so same-origin is the normal
 * case and needs no CORS headers at all. ALLOWED_ORIGIN exists only if you
 * later host the HTML elsewhere - e.g. "https://myfrontend.vercel.app".
 */
const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(
  cors({
    origin: allowedOrigin ? allowedOrigin.split(",").map((s) => s.trim()) : false,
    credentials: true,
  })
);

/* ------------------------------------------------------------------ */
/* Parsers + logging                                                   */
/* ------------------------------------------------------------------ */
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));
app.use(cookieParser());
app.use(morgan("dev"));

/* ------------------------------------------------------------------ */
/* Static frontend                                                     */
/* ------------------------------------------------------------------ */
/**
 * public/ is served as-is. index.html answers "/", so the site is browsable
 * straight from http://localhost:4000 with no build step.
 */
app.use(express.static(path.join(__dirname, "public")));

/* ------------------------------------------------------------------ */
/* API routes                                                          */
/* ------------------------------------------------------------------ */
// /api/auth/*    -> public signup/login, session info
// /api/profile/* -> protected by requireAuth inside routes/profile.js
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

/** GET /api/health - used by the start-up check and easy to curl. */
app.get("/api/health", async (_req, res) => {
  const schema = await checkSchema();
  res.json({
    ok: true,
    service: "meraghar-auth",
    env: process.env.NODE_ENV || "development",
    databaseConfigured: isDbConfigured(),
    schema,
    time: new Date().toISOString(),
  });
});

/* ------------------------------------------------------------------ */
/* 404 for anything that matched no route                              */
/* ------------------------------------------------------------------ */
app.use((req, res) => {
  // Unknown /api paths must return JSON, not the 404 HTML page, or the
  // frontend's res.json() would throw a confusing parse error.
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({
      ok: false,
      code: "NOT_FOUND",
      message: `API route nahi mila: ${req.method} ${req.path}`,
    });
  }
  res.status(404).sendFile(path.join(__dirname, "public", "404.html"));
});

/* ------------------------------------------------------------------ */
/* Central error handler                                               */
/* ------------------------------------------------------------------ */
// eslint-disable-next-line no-unused-vars -- Express needs the 4-arg signature
app.use((err, req, res, next) => {
  // Upload problems get their own clear message instead of a generic 500.
  if (err instanceof multer.MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "Photo 2MB se chhoti honi chahiye."
        : err.field || "Sirf ek JPG/PNG photo allowed hai (2MB tak).";
    return res.status(400).json({ ok: false, code: err.code, message });
  }

  // A bad JSON body arrives as a SyntaxError from express.json().
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({ ok: false, code: "BAD_JSON", message: "Request theek nahi hai." });
  }

  console.error("[error]", err);
  res.status(500).json({
    ok: false,
    code: "SERVER_ERROR",
    message: "Kuch galat ho gaya. Dobara try karein.",
  });
});

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
async function start() {
  console.log("\n  MeraGhar Auth Server");
  console.log("  --------------------");

  if (!isDbConfigured()) {
    console.warn("  [X] Database NOT configured.");
    console.warn("      Copy .env.example to .env and set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY.");
  } else {
    const schema = await checkSchema();
    if (schema.ok) {
      console.log("  [OK] Database connected and tables are ready.");
    } else {
      console.warn(`  [!] ${schema.message}`);
      console.warn("      The pages will still load, but signup/login will not work until this is done.");
    }
  }

  if (!process.env.JWT_SECRET) {
    console.warn("  [X] JWT_SECRET is not set - login will fail.");
    console.warn("      Generate one with:  node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"");
  }

  app.listen(PORT, () => {
    console.log(`\n  Server ready ->  http://localhost:${PORT}\n`);
  });
}

start();

module.exports = app;
