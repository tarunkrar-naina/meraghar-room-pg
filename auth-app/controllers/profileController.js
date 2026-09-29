/**
 * controllers/profileController.js
 * ------------------------------------------------------------------
 * Read, update and profile-photo upload for the signed-in user.
 *
 * Every handler here runs behind middleware/auth.js `requireAuth`, so
 * `req.user` is guaranteed. Note that the user id ALWAYS comes from the JWT
 * (`req.user.id`) and never from the request body - otherwise anyone could
 * edit somebody else's profile by sending a different id.
 */

"use strict";

const fs = require("fs");
const path = require("path");
const Profile = require("../models/Profile");
const User = require("../models/User");
const { deleteUploadedPhoto, UPLOAD_DIR } = require("../config/upload");

/** Strips null/empty strings so the SQL update only touches real changes. */
function clean(value) {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? "" : trimmed;
}

/**
 * GET /api/profile
 * Returns the account row joined with the profile row.
 */
async function getProfile(req, res, next) {
  try {
    const profile = await Profile.ensureProfile(req.user);

    res.json({
      ok: true,
      user: {
        id: req.user.id,
        name: profile?.name || req.user.name,
        mobile: req.user.mobile,
        email: req.user.email,
        photo: profile?.photo ?? null,
        city: profile?.city ?? "",
        state: profile?.state ?? "",
        pincode: profile?.pincode ?? "",
        address: profile?.address ?? "",
        about: profile?.about ?? "",
        // "Joined date" comes from the account row, not the profile row.
        createdAt: profile?.createdAt ?? req.user.createdAt,
        updatedAt: profile?.updatedAt ?? null,
        lastLogin: req.user.lastLogin,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/profile
 * Updates name, city, state, pincode, address, about.
 *
 * mobile and email are intentionally NOT editable here. They are the unique
 * identity columns in auth_users; allowing them to change from a profile form
 * would let someone take over an account by claiming its number, and would
 * need a whole extra verification (OTP) flow. They are shown read-only in the
 * edit form instead.
 */
async function updateProfile(req, res, next) {
  try {
    const { name, city, state, pincode, address, about } = req.body;

    const patch = {
      name: clean(name),
      city: clean(city),
      state: clean(state),
      pincode: clean(pincode),
      address: clean(address),
      about: clean(about),
    };

    const updated = await Profile.updateProfile(req.user.id, patch);

    // Keep auth_users.name in step so the navbar and any future email show the
    // same display name. A failure here must not lose the profile update.
    if (patch.name && patch.name !== req.user.name) {
      try {
        const db = require("../config/db").getDb();
        if (db) {
          await db.from("auth_users").update({ name: patch.name }).eq("id", req.user.id);
        }
      } catch {
        /* non-fatal */
      }
    }

    res.json({
      ok: true,
      message: "Profile update ho gaya.",
      user: {
        id: req.user.id,
        name: updated?.name ?? req.user.name,
        mobile: req.user.mobile,
        email: req.user.email,
        photo: updated?.photo ?? null,
        city: updated?.city ?? "",
        state: updated?.state ?? "",
        pincode: updated?.pincode ?? "",
        address: updated?.address ?? "",
        about: updated?.about ?? "",
        createdAt: updated?.createdAt ?? req.user.createdAt,
        updatedAt: updated?.updatedAt ?? null,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/profile/photo   (multipart/form-data, field name: "photo")
 *
 * Stores the image in public/uploads and records its public URL on the profile.
 * When the user already had a photo we delete the old file so the folder does
 * not fill up with orphans.
 */
async function uploadPhoto(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        ok: false,
        code: "NO_FILE",
        message: "Koi photo select nahi ki.",
      });
    }

    // Only the random filename is exposed, never the path the client sent.
    const publicUrl = `/uploads/${req.file.filename}`;

    const current = await Profile.findByUserId(req.user.id);
    const updated = await Profile.updateProfile(req.user.id, { photo: publicUrl });

    // New photo saved successfully, so the previous one is now garbage.
    if (current?.photo && current.photo !== publicUrl) {
      deleteUploadedPhoto(current.photo);
    }

    res.json({
      ok: true,
      message: "Photo upload ho gayi!",
      photo: updated?.photo ?? publicUrl,
    });
  } catch (err) {
    // If the DB write failed, remove the file we just wrote so we do not leave
    // an orphaned upload on disk.
    if (req.file) {
      try {
        fs.unlinkSync(path.join(UPLOAD_DIR, req.file.filename));
      } catch {
        /* ignore */
      }
    }
    next(err);
  }
}

module.exports = { getProfile, updateProfile, uploadPhoto };
