/**
 * models/Profile.js
 * ------------------------------------------------------------------
 * Data access for the `auth_profiles` table.
 *
 * A profile row is created AUTOMATICALLY the moment a user signs up, and is
 * also repaired on login if it somehow went missing (see
 * `ensureProfile`). This is what the spec means by "auto-created after login".
 *
 * Columns:
 *   userId    uuid  - primary key AND foreign key to auth_users.id (1-to-1)
 *   photo     text  - public URL of the uploaded photo, e.g. /uploads/x.jpg
 *   name      text  - display name (kept in sync with auth_users.name)
 *   city      text
 *   state     text
 *   pincode   text  - stored as text, Indian PIN codes keep their leading zero
 *   address   text
 *   about     text
 *   createdAt tstz
 *   updatedAt tstz
 *
 * mobile / email / joined date are NOT duplicated here - they live on
 * auth_users and are joined in by the controller. Duplicating them would let
 * the two copies drift apart and would re-open the duplicate-account problem
 * that the UNIQUE constraints on auth_users exist to prevent.
 */

"use strict";

const { getDb, TABLES } = require("../config/db");

/** Columns that the client is allowed to write. Anything else is ignored. */
const EDITABLE_COLUMNS = ["name", "city", "state", "pincode", "address", "about", "photo"];

/**
 * Creates the profile row for a brand new user.
 * Safe to call more than once: if the row already exists it is left alone,
 * which is what lets `ensureProfile` use it as a self-healing repair.
 */
async function createProfile({ userId, name }) {
  const db = getDb();
  if (!db) return null;

  const now = new Date().toISOString();

  const { data, error } = await db
    .from(TABLES.profiles)
    .upsert(
      {
        userId,
        name: name || "",
        photo: null,
        city: "",
        state: "",
        pincode: "",
        address: "",
        about: "",
        createdAt: now,
        updatedAt: now,
      },
      { onConflict: "userId", ignoreDuplicates: true }
    )
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/** Returns the profile for a user, or null when it does not exist yet. */
async function findByUserId(userId) {
  const db = getDb();
  if (!db) return null;

  const { data, error } = await db
    .from(TABLES.profiles)
    .select("*")
    .eq("userId", userId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

/**
 * Guarantees a profile exists for this user and returns it.
 * Called from both signup and the `requireAuth` middleware, so a profile can
 * never be missing even if an earlier insert failed.
 */
async function ensureProfile(user) {
  const existing = await findByUserId(user.id);
  if (existing) return existing;
  return createProfile({ userId: user.id, name: user.name });
}

/**
 * Updates whitelisted profile fields.
 * @param {string} userId
 * @param {object} patch - only keys present in EDITABLE_COLUMNS are applied
 */
async function updateProfile(userId, patch) {
  const db = getDb();
  if (!db) return null;

  // Build the update strictly from the whitelist, and drop empty values so a
  // blank form field can never wipe a column that the client did not intend
  // to change.
  const update = { updatedAt: new Date().toISOString() };
  for (const key of EDITABLE_COLUMNS) {
    if (Object.prototype.hasOwnProperty.call(patch, key) && patch[key] !== undefined) {
      update[key] = patch[key];
    }
  }

  const { data, error } = await db
    .from(TABLES.profiles)
    .update(update)
    .eq("userId", userId)
    .select("*")
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data;
}

module.exports = { createProfile, findByUserId, ensureProfile, updateProfile, EDITABLE_COLUMNS };
