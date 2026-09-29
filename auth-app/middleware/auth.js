/**
 * middleware/auth.js
 * ------------------------------------------------------------------
 * JWT session handling.
 *
 * The login flow issues a signed JWT and stores it in an httpOnly cookie, so
 * the token is invisible to JavaScript. That single choice blocks the most
 * common attack in a hand-rolled auth system: token theft via XSS. If an
 * attacker can run script on the page they still cannot read the cookie.
 *
 * Cookie flags:
 *   httpOnly  - JavaScript cannot read it (XSS protection)
 *   sameSite  - 'lax' blocks cross-site POST/CSRF from other origins
 *   secure    - true in production (HTTPS only); false in dev because we run
 *               on plain http://localhost
 */

"use strict";

const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Profile = require("../models/Profile");

/** Name of the cookie holding the JWT. */
const TOKEN_COOKIE = "mg_token";
/** Name of the cookie remembering the last identifier (mobile or email ONLY). */
const REMEMBER_COOKIE = "mg_last_user";

/** 7 days when "Remember me" is ticked, otherwise 1 day. */
const REMEMBER_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/** Token lifetime strings handed to jsonwebtoken. */
const REMEMBER_TTL = "7d";
const SESSION_TTL = "1d";

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET is not set. Copy .env.example to .env and set a long random string."
    );
  }
  return secret;
}

/** Signs the JWT that goes into the cookie. */
function signToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      name: user.name,
      mobile: user.mobile,
      email: user.email,
    },
    getJwtSecret(),
    { expiresIn: process.env.JWT_EXPIRES_IN || SESSION_TTL }
  );
}

/** Shared cookie options for the JWT cookie. */
function tokenCookieOptions(maxAgeMs) {
  return {
    httpOnly: true,
    sameSite: "lax",
    // Secure cookies are only sent over HTTPS. On plain http://localhost the
    // browser would drop the cookie entirely, so we enable it only in prod.
    secure: process.env.NODE_ENV === "production",
    maxAge: maxAgeMs,
    path: "/",
  };
}

/**
 * Sets the session cookie after a successful login.
 * @param {import('express').Response} res
 * @param {object} user
 * @param {boolean} rememberMe
 */
function issueSession(res, user, rememberMe) {
  const ttl = rememberMe ? REMEMBER_TTL : SESSION_TTL;
  const maxAge = rememberMe ? REMEMBER_MAX_AGE_MS : SESSION_MAX_AGE_MS;

  // The JWT itself has to carry the same lifetime as the cookie, otherwise a
  // "remember me" login would still expire after 1 day.
  const token = jwt.sign(
    { sub: user.id, name: user.name, mobile: user.mobile, email: user.email },
    getJwtSecret(),
    { expiresIn: ttl }
  );

  res.cookie(TOKEN_COOKIE, token, tokenCookieOptions(maxAge));

  // Remembered identifier for the "Welcome back" screen. This holds the mobile
  // number or email and NOTHING else - never the password, never the JWT.
  if (rememberMe) {
    res.cookie(REMEMBER_COOKIE, user.mobile || user.email, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: REMEMBER_MAX_AGE_MS,
      path: "/",
    });
  }
}

/** Clears both cookies on logout. */
function clearSession(res) {
  res.clearCookie(TOKEN_COOKIE, { path: "/" });
  res.clearCookie(REMEMBER_COOKIE, { path: "/" });
}

/** Reads the JWT from the request cookie, or null when there is none. */
function readToken(req) {
  return req.cookies?.[TOKEN_COOKIE] || null;
}

/** Verifies a JWT string. Returns the payload, or null when invalid/expired. */
function verifyToken(token) {
  if (!token) return null;
  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    // Thrown for tampered tokens and for expired ones alike. Both mean the
    // same thing to us: this request is not authenticated.
    return null;
  }
}

/**
 * Protects a route. Sends 401 JSON when there is no valid session.
 *
 * We deliberately re-read the user from the database instead of trusting the
 * JWT claims. It costs one query but means a deleted or downgraded account
 * loses access immediately, rather than staying valid until the token expires.
 */
async function requireAuth(req, res, next) {
  try {
    const payload = verifyToken(readToken(req));
    if (!payload) {
      return res.status(401).json({
        ok: false,
        code: "NOT_AUTHENTICATED",
        message: "Pehle login karein.",
      });
    }

    const user = await User.findById(payload.sub);
    if (!user) {
      clearSession(res);
      return res.status(401).json({
        ok: false,
        code: "NOT_AUTHENTICATED",
        message: "Session invalid. Please login again.",
      });
    }

    req.user = user;
    // Self-healing: guarantees the profile row exists for this user.
    req.profile = await Profile.ensureProfile(user);
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Attaches `req.user` when a valid session exists, but never blocks.
 * Used by /api/auth/me and the navbar so a logged-out visitor simply gets
 * `user: null` instead of a redirect.
 */
async function optionalAuth(req, res, next) {
  try {
    const payload = verifyToken(readToken(req));
    if (payload) req.user = await User.findById(payload.sub);
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = {
  TOKEN_COOKIE,
  REMEMBER_COOKIE,
  signToken,
  issueSession,
  clearSession,
  readToken,
  verifyToken,
  requireAuth,
  optionalAuth,
};
