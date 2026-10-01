/**
 * routes/auth.js
 * ------------------------------------------------------------------
 * Signup / login / logout / session routes.
 *
 * The validation chains below are the SERVER-side contract. The HTML form also
 * validates, but that is only to give instant feedback - these rules are what
 * actually protect the database, because a request can be sent without ever
 * opening the page.
 */

"use strict";

const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const ctrl = require("../controllers/authController");
const { validate } = require("../middleware/validate");
const { optionalAuth } = require("../middleware/auth");
const { limiterDisabled, limiterMax } = require("../config/rateLimit");

const router = express.Router();

/**
 * Shared limiter for credential endpoints.
 *
 * Brute-forcing a password means many login attempts, and creating throwaway
 * accounts means many signup attempts, so both routes are limited hard.
 * 10 attempts per 15 minutes per IP is enough for a real person and useless
 * for an attacker. The smoke test needs more than that in one go, so the
 * ceiling is overridable - see config/rateLimit.js.
 */
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: limiterMax(10),
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => limiterDisabled(),
  message: {
    ok: false,
    code: "RATE_LIMITED",
    message: "Bahut zyada koshish. 15 minute baad try karein.",
  },
});

/** Indian mobile number: exactly 10 digits, first digit 6-9. */
const MOBILE_RULES = [
  body("mobile")
    .trim()
    .matches(/^[6-9]\d{9}$/)
    .withMessage("Mobile number 10 digit ka hona chahiye aur 6 se 9 se shuru hona chahiye."),
];

const EMAIL_RULES = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("Email sahi nahi hai."),
];

/**
 * POST /api/auth/signup
 * Field rules: name, mobile, email, password, confirmPassword.
 *
 * `confirmPassword` is compared against `password` with `custom()`, so the two
 * can never drift apart. A plain `.equals()` would work too, but custom() lets
 * us return a message in the user's language.
 */
router.post(
  "/signup",
  credentialLimiter,
  [
    body("name")
      .trim()
      .isLength({ min: 2, max: 80 })
      .withMessage("Naam 2 se 80 characters ka hona chahiye."),
    ...MOBILE_RULES,
    ...EMAIL_RULES,
    body("password")
      .isLength({ min: 8, max: 72 })
      .withMessage("Password kam se kam 8 characters ka hona chahiye.")
      // 72 is bcrypt's hard limit - anything longer is silently ignored by the
      // hash, so we cap it here instead of letting it surprise the user later.
      .matches(/[A-Za-z]/)
      .withMessage("Password me kam se kam ek letter hona chahiye.")
      .matches(/\d/)
      .withMessage("Password me kam se kam ek number hona chahiye."),
    body("confirmPassword")
      .custom((value, { req }) => value === req.body.password)
      .withMessage("Password aur Confirm Password match nahi kar rahe."),
  ],
  validate,
  ctrl.signup
);

/**
 * POST /api/auth/login
 * `identifier` accepts EITHER a 10 digit mobile OR an email, which is why it
 * gets a looser rule than signup's two separate fields.
 */
router.post(
  "/login",
  credentialLimiter,
  [
    body("identifier")
      .trim()
      .notEmpty()
      .withMessage("Mobile number ya email daalein.")
      .bail()
      .custom((value) => /^\d{10}$/.test(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
      .withMessage("10 digit mobile number ya sahi email daalein."),
    body("password").notEmpty().withMessage("Password daalein."),
    body("rememberMe")
      .optional()
      .isBoolean()
      .withMessage("rememberMe true ya false hona chahiye."),
  ],
  validate,
  ctrl.login
);

/** POST /api/auth/logout - clears the session cookies. */
router.post("/logout", ctrl.logout);

/**
 * POST /api/auth/forget - clears ONLY the remembered identifier cookie.
 * Backs "Use a different account"; the user stays logged in if they were.
 */
router.post("/forget", ctrl.forget);

/**
 * GET /api/auth/me
 * `optionalAuth` means this never 401s - it just reports `user: null` when
 * there is no session, which is what the navbar needs on every page.
 */
router.get("/me", optionalAuth, ctrl.me);

/** GET /api/auth/remembered - identifier for the "Welcome back" screen. */
router.get("/remembered", ctrl.remembered);

module.exports = router;
