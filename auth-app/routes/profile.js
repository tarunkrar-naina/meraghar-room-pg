/**
 * routes/profile.js
 * ------------------------------------------------------------------
 * Profile read / update / photo upload.
 *
 * `requireAuth` is applied with router.use(), so EVERY route in this file is
 * protected by default. If a new route is added later it cannot accidentally
 * be left unprotected - the guard is not something you have to remember to add
 * on each line.
 */

"use strict";

const express = require("express");
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");

const ctrl = require("../controllers/profileController");
const { validate } = require("../middleware/validate");
const { requireAuth } = require("../middleware/auth");
const { upload } = require("../config/upload");

const router = express.Router();

// Applies to every route in this file from here down.
router.use(requireAuth);

/** Uploads are rate limited too, otherwise a user can fill the disk. */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    ok: false,
    code: "RATE_LIMITED",
    message: "Bahut zyada photos upload ki. Thodi der baad try karein.",
  },
});

/** GET /api/profile - full profile of the signed-in user. */
router.get("/", ctrl.getProfile);

/**
 * PUT /api/profile
 *
 * Note there is NO body rule for a user id: the account is always taken from
 * the JWT. Accepting one would let a caller edit any profile by changing a
 * single field in the request.
 */
router.put(
  "/",
  [
    body("name").optional().trim().isLength({ min: 2, max: 80 }).withMessage("Naam 2 se 80 characters ka hona chahiye."),
    body("city").optional().trim().isLength({ max: 60 }).withMessage("City 60 characters se lambi nahi ho sakti."),
    body("state").optional().trim().isLength({ max: 60 }).withMessage("State 60 characters se lambi nahi ho sakti."),
    // PIN codes are text, not numbers - "012345" is valid and would lose its
    // leading zero if we stored it as a number.
    body("pincode")
      .optional({ values: "falsy" })
      .trim()
      .matches(/^\d{6}$/)
      .withMessage("Pincode 6 digit ka hona chahiye."),
    body("address").optional({ values: "falsy" }).trim().isLength({ max: 300 }).withMessage("Address 300 characters se lambi nahi ho sakti."),
    body("about").optional({ values: "falsy" }).trim().isLength({ max: 500 }).withMessage("About 500 characters se lambi nahi ho sakti."),
  ],
  validate,
  ctrl.updateProfile
);

/**
 * POST /api/profile/photo
 * Field name must be "photo" to match the FormData in the browser.
 * `single()` makes multer reject a second file with a clear error.
 */
router.post("/photo", uploadLimiter, upload.single("photo"), ctrl.uploadPhoto);

module.exports = router;
