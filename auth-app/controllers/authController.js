/**
 * controllers/authController.js
 * ------------------------------------------------------------------
 * Signup / login / logout / session-info handlers.
 *
 * Every handler answers with the same envelope so the frontend can rely on
 * one shape:
 *   success -> { ok: true,  ...data }
 *   failure -> { ok: false, code: "...", message: "..." }
 */

"use strict";

const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Profile = require("../models/Profile");
const {
  issueSession,
  clearSession,
  forgetRememberedUser,
  REMEMBER_COOKIE,
} = require("../middleware/auth");
const { DatabaseError } = require("../config/db");

/** Work factor for bcrypt. 12 is a good balance on modern hardware. */
const BCRYPT_ROUNDS = 12;

/**
 * POST /api/auth/signup
 *
 * 1. (express-validator already checked the shape of the input)
 * 2. Reject duplicate mobile / email with a friendly message
 * 3. Hash the password with bcrypt
 * 4. Insert the user
 * 5. Auto-create the profile row
 * 6. Log them straight in and send them to profile setup
 */
async function signup(req, res, next) {
  try {
    const { name, mobile, email, password } = req.body;

    // Lower-casing the email makes "A@B.com" and "a@b.com" the same account,
    // which is what users expect and what stops duplicate signups.
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedMobile = String(mobile).trim();

    // Pre-check so the user gets a clear message instead of a raw DB error.
    if (await User.isEmailTaken(normalizedEmail)) {
      return res.status(409).json({
        ok: false,
        code: "EMAIL_TAKEN",
        message: "Ye email pehle se registered hai. Login karein.",
      });
    }

    if (await User.isMobileTaken(normalizedMobile)) {
      return res.status(409).json({
        ok: false,
        code: "MOBILE_TAKEN",
        message: "Ye mobile number pehle se registered hai. Login karein.",
      });
    }

    // Hash BEFORE anything touches the database. The plaintext password must
    // never be written anywhere.
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const created = await User.createUser({
      name: String(name).trim(),
      mobile: normalizedMobile,
      email: normalizedEmail,
      passwordHash,
    });

    if (!created.ok) {
      const status = created.code === "DUPLICATE" ? 409 : 500;
      return res.status(status).json({ ok: false, code: created.code, message: created.message });
    }

    // Profile is created automatically here - the spec requires it, and the
    // user should never see a half-built account.
    await Profile.createProfile({ userId: created.user.id, name: created.user.name });

    // Sign the new user in immediately so profile setup can save to the DB.
    issueSession(res, created.user, true);

    res.status(201).json({
      ok: true,
      message: "Account ban gaya! Ab apni profile complete karein.",
      user: created.user,
      // Tells the frontend to send them to the profile setup form.
      redirectTo: "/edit-profile?welcome=1",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 *
 * Accepts EITHER a 10 digit mobile number OR an email in the same `identifier`
 * field - that is what the "Login with Mobile Number or Email" requirement
 * needs. `rememberMe` controls whether the JWT lives for 7 days or 1 day.
 */
async function login(req, res, next) {
  try {
    const { identifier, password } = req.body;
    const rememberMe = req.body.rememberMe === true || req.body.rememberMe === "true";

    const normalized = String(identifier).trim().toLowerCase();

    const user = await User.findByIdentifier(normalized);

    if (!user) {
      // NOTE: telling the user "account not found" is friendlier but it does let
      // someone test which numbers are registered. The spec explicitly asks for
      // this message, so it stays; production hardening would use one generic
      // "mobile/email or password is incorrect" for both cases.
      return res.status(404).json({
        ok: false,
        code: "USER_NOT_FOUND",
        message: "Ye mobile number ya email se koi account nahi mila.",
      });
    }

    // bcrypt.compare hashes the candidate against the stored hash itself, so we
    // never decrypt or store anything reversible.
    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      return res.status(401).json({
        ok: false,
        code: "WRONG_PASSWORD",
        message: "Password galat hai. Dobara try karein.",
      });
    }

    // Record the login time, but never fail the login because of it.
    await User.updateLastLogin(user.id);

    // Self-heal the profile in case signup's insert had failed earlier.
    await Profile.ensureProfile(user);

    issueSession(res, user, rememberMe);

    res.json({
      ok: true,
      message: `Welcome, ${user.name}!`,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile,
        email: user.email,
        lastLogin: user.lastLogin,
      },
      redirectTo: "/profile",
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 * Clears both cookies. Always 200, because "you are logged out" is the
 * success state either way.
 */
async function logout(req, res) {
  clearSession(res);
  res.json({ ok: true, message: "Logout ho gaye.", redirectTo: "/" });
}

/**
 * POST /api/auth/forget
 *
 * Backs the "Use a different account" link on the Welcome back screen. It
 * clears ONLY the remembered identifier cookie, so the user stops being
 * greeted on every visit but is NOT logged out - if they happened to arrive
 * with a valid session, that session is left completely untouched.
 */
async function forget(req, res) {
  forgetRememberedUser(res);
  res.json({ ok: true, message: "Yeh account yaad nahi rahega." });
}

/**
 * GET /api/auth/me
 * The frontend calls this on every page load. If a valid session exists the
 * navbar renders the name + photo, otherwise it renders Login / Signup.
 */
async function me(req, res, next) {
  try {
    if (!req.user) {
      return res.json({ ok: true, user: null });
    }

    const profile = await Profile.ensureProfile(req.user);

    res.json({
      ok: true,
      user: {
        id: req.user.id,
        name: req.user.name,
        mobile: req.user.mobile,
        email: req.user.email,
        createdAt: req.user.createdAt,
        lastLogin: req.user.lastLogin,
        photo: profile?.photo ?? null,
        city: profile?.city ?? "",
        state: profile?.state ?? "",
        pincode: profile?.pincode ?? "",
        address: profile?.address ?? "",
        about: profile?.about ?? "",
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/auth/remembered
 * Powers the JustDial/OLX style "Welcome back" screen.
 *
 * Returns the identifier we remembered (mobile or email) plus the display
 * name, so the page can show "Continue as Naina". Only the IDENTIFIER is ever
 * stored in that cookie - never the password, never the JWT. When no cookie is
 * present the response is `{ remembered: false }` and the page falls through
 * to the normal login form.
 */
async function remembered(req, res) {
  const identifier = req.cookies?.[REMEMBER_COOKIE];
  if (!identifier) {
    return res.json({ ok: true, remembered: false });
  }

  try {
    const user = await User.findByIdentifier(identifier);

    // Cookie exists but the account is gone (deleted / re-registered).
    if (!user) {
      return res.json({ ok: true, remembered: false });
    }

    const profile = await Profile.findByUserId(user.id);

    res.json({
      ok: true,
      remembered: true,
      identifier: user.mobile || user.email,
      name: profile?.name || user.name,
      photo: profile?.photo ?? null,
    });
  } catch (err) {
    // A missing table / key is a setup problem, not a "nothing remembered"
    // answer, so it must reach the user instead of silently showing the login
    // form and hiding the real reason.
    if (err instanceof DatabaseError) throw err;

    // Any other failure must not break the page - just show the login form.
    res.json({ ok: true, remembered: false });
  }
}

module.exports = { signup, login, logout, forget, me, remembered };
