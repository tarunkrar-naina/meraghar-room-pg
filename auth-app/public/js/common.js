/* =====================================================================
   common.js - shared helpers for every page
   ---------------------------------------------------------------------
   Loaded on every page with a plain <script src> tag (no bundler, no
   framework). It owns:
     - the fetch wrapper that talks to our Express API
     - toasts and the loading spinner
     - navbar rendering (logged in vs logged out)
     - tiny form helpers (mark a field invalid / valid)

   Because the session JWT lives in an httpOnly cookie, the browser sends it
   automatically on every same-origin request. We never read or store the
   token in JavaScript - that is the whole point of httpOnly.
   ===================================================================== */

"use strict";

/* ------------------------------------------------------------------ */
/* Toast notifications                                                 */
/* ------------------------------------------------------------------ */
function toastHost() {
  let host = document.getElementById("toast-host");
  if (!host) {
    host = document.createElement("div");
    host.id = "toast-host";
    host.className = "toast-host";
    host.setAttribute("role", "status");
    host.setAttribute("aria-live", "polite");
    document.body.appendChild(host);
  }
  return host;
}

/**
 * Shows a short-lived message in the top-right corner.
 * @param {string} message
 * @param {"success"|"error"|"info"} [type]
 */
function toast(message, type = "info") {
  const host = toastHost();

  const el = document.createElement("div");
  el.className = "toast toast-" + type;

  const icon = document.createElement("span");
  icon.className = "toast-icon";
  icon.textContent = type === "success" ? "✓" : type === "error" ? "!" : "i";

  const text = document.createElement("span");
  // textContent, never innerHTML - user data must never become markup.
  text.textContent = message;

  el.append(icon, text);
  host.appendChild(el);

  setTimeout(() => el.remove(), 4000);
}

/* ------------------------------------------------------------------ */
/* Full-page loader                                                    */
/* ------------------------------------------------------------------ */
function showLoader(on) {
  let el = document.getElementById("page-loader");
  if (on && !el) {
    el = document.createElement("div");
    el.id = "page-loader";
    el.className = "page-loader show";
    // Class only - a style="" attribute would be blocked by our CSP.
    el.innerHTML = '<div class="spinner spinner-dark spinner-xl"></div>';
    document.body.appendChild(el);
  } else if (el) {
    el.classList.toggle("show", Boolean(on));
  }
}

/* ------------------------------------------------------------------ */
/* API wrapper                                                         */
/* ------------------------------------------------------------------ */
/**
 * Calls our Express API and always resolves to a plain object.
 *
 * It never throws for a 4xx - a failed login is a normal outcome, not an
 * exception - so page code can just check `result.ok`.
 *
 * @param {string} path   e.g. "/api/auth/login"
 * @param {object} [opts] { method, body, formData }
 * @returns {Promise<{ok:boolean, message:string, [key:string]:any}>}
 */
async function api(path, opts = {}) {
  const { method = "GET", body, formData } = opts;

  const init = {
    method,
    // credentials:"include" makes the browser send the auth cookie. It is the
    // default for same-origin requests, but stating it makes the intent clear.
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  };

  if (formData) {
    // Do NOT set Content-Type manually - the browser has to add the
    // multipart boundary itself or multer cannot parse the file.
    init.body = formData;
  } else if (body !== undefined) {
    init.headers["Content-Type"] = "application/json";
    init.body = JSON.stringify(body);
  }

  try {
    const res = await fetch(path, init);

    let data;
    try {
      data = await res.json();
    } catch {
      // Non-JSON response (e.g. the server is down and a proxy returned HTML).
      return { ok: false, message: "Server se connect nahi ho paya." };
    }

    return data;
  } catch {
    return { ok: false, message: "Network error. Internet check karein." };
  }
}

/* ------------------------------------------------------------------ */
/* Session                                                             */
/* ------------------------------------------------------------------ */

/** Cached so several functions on one page do not each hit /api/auth/me. */
let sessionCache = null;

/**
 * Returns the current user, or null when logged out.
 * @param {boolean} [force] - bypass the cache
 */
async function getSession(force = false) {
  if (sessionCache && !force) return sessionCache;
  const res = await api("/api/auth/me");
  sessionCache = res.ok ? res.user : null;
  return sessionCache;
}

/** Clears the cached session (used right after login/logout). */
function clearSessionCache() {
  sessionCache = null;
}

/* ------------------------------------------------------------------ */
/* Navbar                                                              */
/* ------------------------------------------------------------------ */
/** Shows the user's initials inside a circular avatar element. */
function initials(name) {
  const parts = String(name || "?").trim().split(/\s+/);
  return ((parts[0]?.[0] || "?") + (parts[1]?.[0] || "")).toUpperCase();
}

/**
 * Builds the avatar markup. Returns either an <img> (when a photo exists)
 * or a div with initials.
 */
function avatarEl(photo, name, large = false) {
  const cls = "avatar" + (large ? " avatar-lg" : "");

  if (photo) {
    const img = document.createElement("img");
    img.className = cls;
    img.src = photo;
    img.alt = name ? name + " ki photo" : "Profile photo";
    // Uploaded files must be allowed by the CSP img-src directive, which it is.
    return img;
  }

  const div = document.createElement("div");
  div.className = cls;
  div.setAttribute("aria-hidden", "true");
  div.textContent = initials(name);
  return div;
}

/**
 * Fills the navbar based on the session.
 * The HTML has placeholder elements with these ids; this swaps their content.
 */
async function renderNavbar() {
  const right = document.getElementById("nav-right");
  if (!right) return;

  const user = await getSession();
  right.innerHTML = "";

  if (user) {
    const chip = document.createElement("a");
    chip.className = "user-chip";
    chip.href = "/profile";
    chip.appendChild(avatarEl(user.photo, user.name));

    const name = document.createElement("span");
    name.className = "name";
    name.textContent = user.name;
    chip.appendChild(name);

    const logout = document.createElement("button");
    logout.type = "button";
    logout.className = "btn btn-ghost";
    logout.textContent = "Logout";
    logout.addEventListener("click", async () => {
      logout.disabled = true;
      logout.textContent = "Logging out...";
      await api("/api/auth/logout", { method: "POST" });
      clearSessionCache();
      window.location.href = "/";
    });

    right.append(chip, logout);
  } else {
    const login = document.createElement("a");
    login.className = "btn btn-ghost";
    login.href = "/login";
    login.textContent = "Login";

    const signup = document.createElement("a");
    signup.className = "btn btn-primary";
    signup.href = "/signup";
    signup.textContent = "Sign up";

    right.append(login, signup);
  }
}

/* ------------------------------------------------------------------ */
/* Form helpers                                                        */
/* ------------------------------------------------------------------ */

/** Marks one field invalid and writes the message under it. */
function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const box = document.getElementById(inputId + "-error");
  if (!input) return;

  input.classList.add("is-invalid");
  if (box) {
    box.textContent = message || "";
    box.classList.toggle("show", Boolean(message));
  }
}

/** Clears the error state on one field (called as the user types). */
function clearFieldError(inputId) {
  setFieldError(inputId, "");
  document.getElementById(inputId)?.classList.remove("is-invalid");
}

/** Clears every inline error inside a form. */
function clearAllErrors(form) {
  form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
  form.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
    el.classList.remove("show");
  });
}

/**
 * Shows the server's error list on the matching inputs.
 * Falls back to the banner when the server did not name a field.
 */
function applyServerErrors(form, result) {
  clearAllErrors(form);

  const details = Array.isArray(result.errors) ? result.errors : [];
  let matched = 0;

  for (const d of details) {
    if (d.field && document.getElementById(d.field)) {
      setFieldError(d.field, d.message);
      matched++;
    }
  }

  // The banner always carries the headline message, whether or not any field
  // was matched, so the user always sees at least one clear explanation.
  showBanner(form, result.message || "Kuch galat hai.", "error");

  // A rate-limit or server failure names no field at all. In that case the
  // banner is easy to miss, so repeat it as a toast too.
  if (matched === 0) toast(result.message || "Kuch galat hai.", "error");

  return matched;
}

/** Writes a message into the form's top alert box. */
function showBanner(form, message, type = "error") {
  const banner = form.querySelector(".alert");
  if (!banner) {
    toast(message, type);
    return;
  }
  banner.className = "alert alert-" + type + " show";
  banner.textContent = message;
}

/** Puts a button into its loading state and returns a reset function. */
function setLoading(button, on, labelWhenDone) {
  if (!button) return () => {};
  if (on) {
    button.dataset.originalText = button.textContent;
    button.disabled = true;
    button.innerHTML = "";
    const sp = document.createElement("span");
    sp.className = "spinner";
    const t = document.createElement("span");
    t.textContent = "Please wait...";
    button.append(sp, t);
  } else {
    button.disabled = false;
    button.textContent = labelWhenDone ?? button.dataset.originalText ?? "Submit";
  }
  return () => setLoading(button, false, labelWhenDone);
}

/* ------------------------------------------------------------------ */
/* Boot                                                                */
/* ------------------------------------------------------------------ */
/** Runs on every page once the DOM is ready. */
document.addEventListener("DOMContentLoaded", () => {
  renderNavbar();
  // Expose the current year in the footer without hardcoding it.
  const year = document.getElementById("year");
  if (year) year.textContent = new Date().getFullYear();
});
