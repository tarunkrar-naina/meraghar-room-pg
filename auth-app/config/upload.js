/**
 * config/upload.js
 * ------------------------------------------------------------------
 * Multer configuration for profile photo uploads.
 *
 * Two independent checks are applied on purpose:
 *   1. the browser-reported MIME type, and
 *   2. the file extension.
 * MIME type alone is trivially spoofed (it is just a header the client sends),
 * so requiring both blocks the common "rename payload.php to photo.png" trick.
 *
 * Limits required by the spec: max 2MB, only jpg / jpeg / png.
 */

"use strict";

const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const multer = require("multer");

/** Absolute path to public/uploads. Created on demand below. */
const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads");

/** Make sure the upload directory exists before the first upload arrives. */
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}
ensureUploadDir();

const ALLOWED_MIME = new Set(["image/jpeg", "image/png"]);
const ALLOWED_EXT = new Set([".jpg", ".jpeg", ".png"]);

const storage = multer.diskStorage({
  destination(_req, _file, cb) {
    ensureUploadDir();
    cb(null, UPLOAD_DIR);
  },

  /**
   * Build a filename that can never be predicted or traversed:
   *   - crypto random hex defeats collisions and name guessing
   *   - the original name is discarded entirely, so a malicious filename like
   *     "../../evil.png" cannot escape the uploads directory
   */
  filename(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}${ext}`;
    cb(null, unique);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
    files: 1,
  },
  fileFilter(_req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();

    if (!ALLOWED_MIME.has(file.mimetype)) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Sirf JPG ya PNG image allowed hai."));
    }

    if (!ALLOWED_EXT.has(ext)) {
      return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "Sirf .jpg, .jpeg ya .png allowed hai."));
    }

    cb(null, true);
  },
});

/**
 * Deletes a previously uploaded photo.
 *
 * Only ever touches files inside public/uploads: the stored value is stripped
 * of any directory component and re-joined onto UPLOAD_DIR, then we confirm
 * the result is still inside UPLOAD_DIR before unlinking. That stops a
 * tampered DB value from turning this into an arbitrary file delete.
 *
 * @param {string|null} storedUrl - e.g. "/uploads/abc.png"
 * @returns {boolean} true when a file was removed
 */
function deleteUploadedPhoto(storedUrl) {
  if (!storedUrl || typeof storedUrl !== "string") return false;
  if (!storedUrl.startsWith("/uploads/")) return false;

  const basename = path.basename(storedUrl);
  const target = path.join(UPLOAD_DIR, basename);

  // Path traversal guard: the resolved path must stay inside UPLOAD_DIR.
  if (!target.startsWith(UPLOAD_DIR + path.sep)) return false;

  try {
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
      return true;
    }
  } catch {
    // A failed cleanup must never break the save that triggered it.
  }
  return false;
}

module.exports = { upload, deleteUploadedPhoto, UPLOAD_DIR };
