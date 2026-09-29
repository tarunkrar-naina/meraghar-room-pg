/**
 * middleware/validate.js
 * ------------------------------------------------------------------
 * Tiny helper that turns express-validator's result array into a
 * single 400 JSON response.
 *
 * Why validate on the server at all when the HTML form already validates?
 * Because client-side validation is only a convenience for the user. Anyone
 * can POST to /api/auth/signup directly with curl or Postman and skip the
 * browser entirely, so the server must never trust it.
 */

"use strict";

const { validationResult } = require("express-validator");

/**
 * Usage:  router.post("/signup", signupRules, validate, controller)
 * Sends 400 with a readable message and stops the chain if anything failed.
 */
function validate(req, res, next) {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    const details = result.array().map((e) => ({
      field: e.path ?? e.param,
      message: e.msg,
    }));

    return res.status(400).json({
      ok: false,
      code: "VALIDATION_ERROR",
      message: details[0]?.message || "Invalid input.",
      errors: details,
    });
  }

  next();
}

module.exports = { validate };
