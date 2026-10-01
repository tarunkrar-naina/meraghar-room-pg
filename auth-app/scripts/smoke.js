/**
 * scripts/smoke.js
 * ------------------------------------------------------------------
 * End-to-end check of the whole auth flow against a RUNNING server.
 *
 * Usage (with the server already running on port 4000):
 *   npm start          # in one terminal
 *   npm run smoke      # in another
 *
 * It creates a throwaway account, logs in, edits the profile, and leaves it in
 * the database so you can inspect the rows afterwards.
 *
 * Exit code 0 = everything passed.
 */

"use strict";

const BASE = process.env.SMOKE_URL || "http://localhost:4000";

/**
 * Exit code without calling process.exit().
 *
 * On Windows, process.exit() while libuv still has handles open trips an
 * assertion inside Node itself ("UV_HANDLE_CLOSING"). Setting the exit code and
 * letting the event loop drain naturally avoids that crash entirely.
 */
function finish(code) {
  process.exitCode = code;
}

/** Simple pass/fail recorder so one failure does not hide the rest. */
const results = [];
function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition), detail });
  const mark = condition ? "PASS" : "FAIL";
  console.log(`  [${mark}] ${name}${detail ? `  -> ${detail}` : ""}`);
}

/** fetch with a cookie jar, because the session lives in a cookie. */
let cookieJar = "";
function jar() {
  return cookieJar
    .split(";")
    .map((c) => c.trim())
    .filter(Boolean)
    .join("; ");
}

async function call(path, options = {}) {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (cookieJar) headers.Cookie = jar();

  let body;
  if (options.json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.json);
  } else if (options.raw !== undefined) {
    body = options.raw;
  }

  const res = await fetch(`${BASE}${path}`, { ...options, headers, body, redirect: "manual" });

  // Keep the most recent value of every cookie we are given.
  const setCookie = res.headers.getSetCookie?.() || [];
  for (const line of setCookie) {
    const [pair] = line.split(";");
    const name = pair.split("=")[0].trim();
    const value = pair.slice(pair.indexOf("=") + 1).trim();
    const kept = cookieJar
      .split(";")
      .map((c) => c.trim())
      .filter((c) => c && !c.startsWith(name + "="));
    cookieJar = [...kept, `${name}=${value}`].join("; ");
  }

  const text = await res.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    /* not JSON */
  }
  return { status: res.status, data, text };
}

(async () => {
  console.log(`\n  Auth smoke test -> ${BASE}\n`);

  // ---------- 0. server reachable ----------
  const health = await call("/api/health");
  check("server is up", health.status === 200 && health.data?.ok, `HTTP ${health.status}`);

  if (health.data?.schema?.ok === false) {
    console.log("\n  [!] Database schema is not applied yet:");
    console.log(`      ${health.data.schema.message}`);
    console.log("\n  Run auth-app/supabase/schema.sql in the Supabase SQL Editor first.\n");
    finish(1);
    return;
  }

  // Unique per run so re-running never collides with an earlier test account.
  const stamp = Date.now().toString().slice(-8);
  // 9 digits after the leading 9 = a full 10 digit mobile (validator wants 6-9 first).
  const mobile = `9${Date.now().toString().slice(-9)}`;
  const email = `smoke_${stamp}@example.com`;
  const password = "SmokeTest123";

  // ---------- 1. validation rejects bad input ----------
  const badSignup = await call("/api/auth/signup", {
    method: "POST",
    json: { name: "X", mobile: "123", email: "nope", password: "abc", confirmPassword: "zzz" },
  });
  check(
    "signup rejects invalid input",
    badSignup.status === 400 && badSignup.data?.code === "VALIDATION_ERROR",
    badSignup.data?.message
  );

  const badLogin = await call("/api/auth/login", {
    method: "POST",
    json: { identifier: "not-an-id", password: "" },
  });
  check(
    "login rejects invalid input",
    badLogin.status === 400 && badLogin.data?.code === "VALIDATION_ERROR",
    badLogin.data?.message
  );

  // ---------- 2. protected route is closed ----------
  const anonProfile = await call("/api/profile");
  check("profile is closed when logged out", anonProfile.status === 401, `HTTP ${anonProfile.status}`);

  // ---------- 3. signup ----------
  const signup = await call("/api/auth/signup", {
    method: "POST",
    json: { name: "Smoke Tester", mobile, email, password, confirmPassword: password },
  });
  check("signup succeeds", signup.status === 201 && signup.data?.ok, signup.data?.message);
  check(
    "signup logs the user in",
    /mg_token=/.test(cookieJar),
    cookieJar ? "session cookie set" : "no cookie"
  );
  check("password hash never returned", !JSON.stringify(signup.data || {}).includes(password));

  const userId = signup.data?.user?.id;
  check("signup returns a user id", Boolean(userId), userId);

  // ---------- 4. profile was auto-created ----------
  const me = await call("/api/auth/me");
  check("session is recognised", Boolean(userId) && me.data?.user?.id === userId, me.data?.user?.mobile);
  check("auto-created profile is reachable", me.status === 200 && me.data?.ok);

  // ---------- 5. duplicates are refused ----------
  const dupe = await call("/api/auth/signup", {
    method: "POST",
    json: { name: "Smoke Tester", mobile, email, password, confirmPassword: password },
  });
  check(
    "duplicate signup is refused",
    dupe.status === 409 && /TAKEN/.test(dupe.data?.code || ""),
    dupe.data?.message
  );

  // ---------- 6. wrong password ----------
  cookieJar = "";
  const wrongPw = await call("/api/auth/login", {
    method: "POST",
    json: { identifier: mobile, password: "WrongPass123" },
  });
  check(
    "wrong password is refused",
    wrongPw.status === 401 && wrongPw.data?.code === "WRONG_PASSWORD",
    wrongPw.data?.message
  );

  // ---------- 7. unknown user ----------
  const noUser = await call("/api/auth/login", {
    method: "POST",
    json: { identifier: "9999999999", password: "Whatever123" },
  });
  check(
    "unknown account is reported",
    noUser.status === 404 && noUser.data?.code === "USER_NOT_FOUND",
    noUser.data?.message
  );

  // ---------- 8. login by mobile ----------
  const byMobile = await call("/api/auth/login", {
    method: "POST",
    json: { identifier: mobile, password, rememberMe: true },
  });
  check("login by mobile works", byMobile.status === 200 && byMobile.data?.ok, byMobile.data?.message);
  check("remember cookie is set", /mg_last_user=/.test(cookieJar));

  // ---------- 9. login by email ----------
  cookieJar = "";
  const byEmail = await call("/api/auth/login", {
    method: "POST",
    json: { identifier: email, password, rememberMe: false },
  });
  check("login by email works", byEmail.status === 200 && byEmail.data?.ok, byEmail.data?.message);
  check("no remember cookie without remember-me", !/mg_last_user=/.test(cookieJar));

  // ---------- 10. remembered screen ----------
  const remembered = await call("/api/auth/remembered");
  check(
    "remembered identifier is returned",
    remembered.data?.remembered === false, // last login did not tick remember-me
    `remembered=${remembered.data?.remembered}`
  );

  // ---------- 11. update profile ----------
  const updated = await call("/api/profile", {
    method: "PUT",
    json: {
      name: "Smoke Tester",
      city: "Kaithal",
      state: "Haryana",
      pincode: "136001",
      address: "Test address 123",
      about: "Automated smoke test profile.",
    },
  });
  check(
    "profile update succeeds",
    updated.status === 200 && updated.data?.ok,
    updated.data?.message
  );
  check("profile saved the city", updated.data?.user?.city === "Kaithal", updated.data?.user?.city);
  check("profile kept the leading-zero PIN", updated.data?.user?.pincode === "136001");

  // ---------- 12. bad pincode ----------
  const badPin = await call("/api/profile", { method: "PUT", json: { pincode: "12" } });
  check("invalid pincode is rejected", badPin.status === 400, badPin.data?.message);

  // ---------- 13. read profile back ----------
  const profile = await call("/api/profile");
  check("profile reads back", profile.data?.user?.city === "Kaithal", profile.data?.user?.state);
  check("joined date is present", Boolean(profile.data?.user?.createdAt));

  // ---------- 14. photo upload rejects a bad type ----------
  const fakeFile = new FormData();
  fakeFile.append("photo", new Blob(["not an image"], { type: "application/pdf" }), "evil.pdf");
  const badUpload = await call("/api/profile/photo", { method: "POST", raw: fakeFile });
  check("non-image upload is rejected", badUpload.status === 400, badUpload.data?.message);

  // ---------- 15. logout ----------
  const logout = await call("/api/auth/logout", { method: "POST" });
  check("logout succeeds", logout.status === 200 && logout.data?.ok);

  const afterLogout = await call("/api/profile");
  check("profile is closed after logout", afterLogout.status === 401, `HTTP ${afterLogout.status}`);

  // ---------- summary ----------
  const failed = results.filter((r) => !r.ok);
  console.log(`\n  ${results.length - failed.length}/${results.length} checks passed\n`);

  if (failed.length > 0) {
    console.log("  Failed:");
    for (const f of failed) console.log(`    - ${f.name} ${f.detail ? `(${f.detail})` : ""}`);
    console.log("");
    finish(1);
    return;
  }

  console.log(`  Test account used: ${mobile} / ${email}`);
  console.log("  (it was left in the database - delete it from the Supabase dashboard)\n");
})().catch((err) => {
  console.error("\n  Smoke test crashed:", err.message);
  console.error("  Is the server running?  npm start\n");
  finish(1);
});
