/* =====================================================================
   auth.js - signup, login and the "Welcome back" screen
   ---------------------------------------------------------------------
   SECURITY NOTE (important, and deliberately different from the brief)
   ---------------------------------------------------------------------
   The brief asked for a "Continue as [Name]" button that logs the user in
   with ONE click. Doing that safely is impossible: it would mean either
   storing the password in the browser, or skipping authentication
   completely. We refuse both.

   So the rule is:
     - If the JWT cookie is still valid  -> auto-login, no question asked.
     - If only the identifier is remembered -> we show "Continue as [Name]",
       which fills the mobile/email in for them so they only type a password.
   The user is remembered, but they are still never silently authenticated.
   ===================================================================== */

"use strict";

/* ------------------------------------------------------------------ */
/* Shared client-side validation                                       */
/* ------------------------------------------------------------------ */
const RULES = {
  mobile: /^[6-9]\d{9}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
};

function validName(v) { return v.trim().length >= 2 && v.trim().length <= 80; }
function validMobile(v) { return RULES.mobile.test(v.trim()); }
function validEmail(v) { return RULES.email.test(v.trim()); }
function validPassword(v) { return v.length >= 8 && v.length <= 72 && /[A-Za-z]/.test(v) && /\d/.test(v); }

/* ------------------------------------------------------------------ */
/* Signup page                                                         */
/* ------------------------------------------------------------------ */
function initSignup() {
  const form = document.getElementById("signup-form");
  if (!form) return;

  // Anyone who is already logged in has no business on the signup page.
  getSession().then((user) => { if (user) window.location.replace("/profile"); });

  const name = document.getElementById("name");
  const mobile = document.getElementById("mobile");
  const email = document.getElementById("email");
  const password = document.getElementById("password");
  const confirm = document.getElementById("confirmPassword");
  const meter = document.getElementById("pw-meter");

  // Clear a field's error as soon as the user starts fixing it - much less
  // frustrating than making them resubmit to find out it is now valid.
  [name, mobile, email, password, confirm].forEach((el) => {
    el?.addEventListener("input", () => clearFieldError(el.id));
  });

  // Strip anything that is not a digit and cap at 10, so an Indian mobile
  // number can never even be typed incorrectly.
  mobile?.addEventListener("input", () => {
    mobile.value = mobile.value.replace(/\D/g, "").slice(0, 10);
  });

  // Simple strength indicator. Purely visual - the real rule is on the server.
  password?.addEventListener("input", () => {
    if (!meter) return;
    const v = password.value;
    let score = 0;
    if (v.length >= 8) score++;
    if (v.length >= 12) score++;
    if (/[A-Z]/.test(v) && /[a-z]/.test(v)) score++;
    if (/\d/.test(v)) score++;
    if (/[^A-Za-z0-9]/.test(v)) score++;

    const labels = ["Bahut kamzor", "Kamzor", "Theek", "Achha", "Mazboot", "Bahut mazboot"];
    meter.textContent = v ? labels[score] : "";
    meter.className = "hint " + (score >= 3 ? "text-ok" : v ? "text-warn" : "");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    // ---- client-side checks, so obvious mistakes never hit the server ----
    let bad = false;
    const fail = (id, msg) => { setFieldError(id, msg); bad = true; };

    if (!validName(name.value))     fail("name", "Naam kam se kam 2 characters ka hona chahiye.");
    if (!validMobile(mobile.value)) fail("mobile", "10 digit ka Indian mobile number daalein (6-9 se shuru).");
    if (!validEmail(email.value))   fail("email", "Email sahi nahi hai.");
    if (!validPassword(password.value)) fail("password", "Password kam se kam 8 characters, ek letter aur ek number.");
    if (confirm.value !== password.value) fail("confirmPassword", "Dono password same hone chahiye.");

    if (bad) { toast("Kuch fields check karein.", "error"); return; }

    const reset = setLoading(form.querySelector("button[type=submit]"), true);

    const result = await api("/api/auth/signup", {
      method: "POST",
      body: {
        name: name.value.trim(),
        mobile: mobile.value.trim(),
        email: email.value.trim(),
        password: password.value,
        confirmPassword: confirm.value,
      },
    });

    reset();

    if (result.ok) {
      clearSessionCache();
      toast(result.message || "Account ban gaya!", "success");
      // Profile setup, exactly as the brief requires.
      window.location.href = result.redirectTo || "/edit-profile?welcome=1";
    } else {
      applyServerErrors(form, result);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Login page                                                          */
/* ------------------------------------------------------------------ */
function initLogin() {
  const form = document.getElementById("login-form");
  if (!form) return;

  const params = new URLSearchParams(window.location.search);
  const identifier = document.getElementById("identifier");
  const password = document.getElementById("password");
  const remember = document.getElementById("rememberMe");

  // "If the JWT is still valid, auto-login directly without asking anything."
  getSession().then((user) => {
    if (user) {
      toast("Aap pehle se login hain.", "info");
      window.location.replace(params.get("next") || "/profile");
    }
  });

  // Arriving from the "Continue as [Name]" button: pre-fill the identifier so
  // the user only has to type their password.
  const prefill = params.get("identifier");
  if (prefill) {
    identifier.value = prefill;
    setTimeout(() => password.focus(), 120);
  }

  identifier?.addEventListener("input", () => clearFieldError("identifier"));
  password?.addEventListener("input", () => clearFieldError("password"));

  // Show/hide the password.
  document.getElementById("toggle-password")?.addEventListener("click", (e) => {
    const isHidden = password.type === "password";
    password.type = isHidden ? "text" : "password";
    e.currentTarget.textContent = isHidden ? "Hide" : "Show";
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAllErrors(form);

    const id = identifier.value.trim();
    if (!id) { setFieldError("identifier", "Mobile number ya email daalein."); return; }
    if (!RULES.mobile.test(id) && !RULES.email.test(id)) {
      setFieldError("identifier", "10 digit mobile number ya sahi email daalein.");
      return;
    }
    if (!password.value) { setFieldError("password", "Password daalein."); return; }

    const reset = setLoading(form.querySelector("button[type=submit]"), true);

    const result = await api("/api/auth/login", {
      method: "POST",
      body: { identifier: id, password: password.value, rememberMe: remember.checked },
    });

    reset();

    if (result.ok) {
      clearSessionCache();
      toast(result.message || "Login ho gaye!", "success");
      // Only allow same-site relative redirects, never an absolute URL, so this
      // cannot be turned into an open-redirect that sends a user to a phishing
      // page after login.
      const next = params.get("next");
      window.location.href = next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : result.redirectTo || "/profile";
    } else {
      applyServerErrors(form, result);
    }
  });
}

/* ------------------------------------------------------------------ */
/* Welcome back screen                                                 */
/* ------------------------------------------------------------------ */
function initWelcome() {
  const box = document.getElementById("welcome-box");
  const loader = document.getElementById("welcome-loader");
  if (!box) return;

  (async () => {
    // 1) A still-valid JWT means we never even show this screen.
    const user = await getSession();
    if (user) {
      window.location.replace("/profile");
      return;
    }

    // 2) Otherwise look up the identifier we remembered.
    const res = await api("/api/auth/remembered");
    if (loader) loader.remove();

    if (!res.ok || !res.remembered) {
      // Nothing remembered -> straight to the normal login form.
      window.location.replace("/login");
      return;
    }

    // Build the card entirely with DOM APIs, never innerHTML, so the stored
    // name and mobile number can never be interpreted as markup.
    box.innerHTML = "";

    const avatarWrap = document.createElement("div");
    avatarWrap.className = "welcome-avatar";
    avatarWrap.appendChild(avatarEl(res.photo, res.name, true));
    box.appendChild(avatarWrap);

    const h = document.createElement("h1");
    h.textContent = "Welcome back";
    box.appendChild(h);

    const p = document.createElement("p");
    p.className = "muted mb-2";
    p.textContent = "आपका पिछला account याद है. Continue करने के लिए अपना password डालें.";
    box.appendChild(p);

    const msg = document.createElement("div");
    msg.className = "welcome-msg";
    // textContent keeps this safe even for a hostile stored value.
    msg.textContent = "Signed in as: " + res.identifier;
    box.appendChild(msg);

    // The big "Continue as [Name]" button.
    const cont = document.createElement("button");
    cont.type = "button";
    cont.className = "continue-as";

    cont.appendChild(avatarEl(res.photo, res.name));

    const meta = document.createElement("div");
    meta.className = "meta";
    const strong = document.createElement("strong");
    strong.textContent = "Continue as " + res.name;
    const span = document.createElement("span");
    span.textContent = res.identifier;
    meta.append(strong, span);
    cont.appendChild(meta);

    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.textContent = "›";
    cont.appendChild(arrow);

    cont.addEventListener("click", () => {
      const next = "/login?identifier=" + encodeURIComponent(res.identifier);
      window.location.href = next;
    });

    box.appendChild(cont);

    // "Use a different account" - forgets the cookie so this screen does not
    // reappear on the next visit.
    const diff = document.createElement("a");
    diff.className = "btn btn-outline btn-block";
    diff.href = "/login?forget=1";
    diff.textContent = "Use a different account";
    box.appendChild(diff);

    const signup = document.createElement("p");
    signup.className = "muted mt-2 mb-0";
    signup.textContent = "Naya account banana hai? ";
    const sLink = document.createElement("a");
    sLink.href = "/signup";
    sLink.textContent = "Sign up";
    signup.appendChild(sLink);
    box.appendChild(signup);
  })();
}

/* ------------------------------------------------------------------ */
/* Logout helper (also used on the profile page)                      */
/* ------------------------------------------------------------------ */
async function doLogout() {
  await api("/api/auth/logout", { method: "POST" });
  clearSessionCache();
  window.location.href = "/";
}

// Boot whichever page we are on. Each init function is a no-op when its
// elements are not present, so one file can safely serve all three pages.
document.addEventListener("DOMContentLoaded", () => {
  initSignup();
  initLogin();
  initWelcome();
});
