/**
 * config/rateLimit.js
 * ------------------------------------------------------------------
 * One place that decides how hard the rate limiters bite, so every route
 * behaves the same and the answer lives in .env instead of in the code.
 *
 * Two knobs:
 *   RATE_LIMIT_MAX   -> override the "attempts per window" number.
 *   RATE_LIMIT=off   -> switch the limiters off completely.
 *
 * Why an opt-out exists at all: the smoke test signs up, logs in, logs in
 * again and probes the error paths, which is 8+ credential requests - more than
 * the 10-per-15-minutes a real session is allowed. Without a switch you could
 * run the test exactly once every 15 minutes, and a red test would often just
 * be the limiter from the previous run talking.
 *
 * SECURITY: the opt-out is ignored when NODE_ENV=production, so a deployment
 * can never ship with brute-force protection disabled by a stray .env value.
 */

"use strict";

/** Limiting is only ever skipped outside production. */
function limiterDisabled() {
  return process.env.NODE_ENV !== "production" && /^(off|false|0|no)$/i.test(
    (process.env.RATE_LIMIT || "").trim()
  );
}

/**
 * Resolve the `max` for a limiter.
 *
 * `RATE_LIMIT_MAX` is read as a number and ignored when it is not one, so a
 * typo can never silently turn a 10-attempt limit into 0 (which would block
 * every user) - the coded default is used instead.
 */
function limiterMax(fallback) {
  const raw = Number(process.env.RATE_LIMIT_MAX);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

module.exports = { limiterDisabled, limiterMax };
