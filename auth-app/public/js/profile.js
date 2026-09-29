/* =====================================================================
   profile.js - the /profile view and the /edit-profile form
   ---------------------------------------------------------------------
   Both pages need a session, so both redirect to /login when there isn't
   one. Everything rendered here comes from the server and is inserted with
   textContent, never innerHTML - a user who typed "<script>" into their
   "about me" must not be able to run it.
   ===================================================================== */

"use strict";

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

/** "2026-09-24T05:54:08Z" -> "24 September 2026" */
function formatDate(iso) {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}

/** Creates a <dt>/<dd> pair for the detail grid. */
function detailRow(dl, label, value) {
  if (!value) return; // hide empty fields instead of showing a blank row
  const wrap = document.createElement("div");
  wrap.className = "detail";
  const dt = document.createElement("dt");
  dt.textContent = label;
  const dd = document.createElement("dd");
  dd.textContent = value;
  wrap.append(dt, dd);
  dl.appendChild(wrap);
}

/** Blocks the page until we know whether a session exists. */
async function requireSession() {
  const user = await getSession();
  if (!user) {
    // remember where they were heading so login can send them back
    window.location.replace("/login?next=" + encodeURIComponent(window.location.pathname));
    return null;
  }
  return user;
}

/* ------------------------------------------------------------------ */
/* /profile  -  read-only view                                         */
/* ------------------------------------------------------------------ */
function initProfileView() {
  const root = document.getElementById("profile-root");
  if (!root) return;

  (async () => {
    const user = await requireSession();
    if (!user) return;

    renderNavbar(); // re-render now that we know the photo/name

    root.innerHTML = "";

    /* ---- header: photo, name, mobile, joined date ---- */
    const head = document.createElement("div");
    head.className = "profile-head";

    head.appendChild(avatarEl(user.photo, user.name, true));

    const who = document.createElement("div");
    who.className = "who";

    const h1 = document.createElement("h1");
    h1.textContent = user.name;

    const sub = document.createElement("p");
    sub.textContent = user.mobile;

    const badge = document.createElement("span");
    badge.className = "badge badge-blue";
    badge.textContent = "Member since " + formatDate(user.createdAt);

    who.append(h1, sub, badge);
    head.appendChild(who);

    const actions = document.createElement("div");
    const edit = document.createElement("a");
    edit.className = "btn btn-primary";
    edit.href = "/edit-profile";
    edit.textContent = "Edit profile";
    actions.appendChild(edit);
    head.appendChild(actions);

    root.appendChild(head);

    /* ---- contact details ---- */
    const contact = document.createElement("div");
    contact.className = "card";
    const ch = document.createElement("h2");
    ch.className = "mb-2";
    ch.textContent = "Contact details";
    const cdl = document.createElement("dl");
    cdl.className = "detail-grid";
    cdl.style.margin = "0"; // CSSOM set - allowed, unlike a style="" attribute
    detailRow(cdl, "Mobile", user.mobile);
    detailRow(cdl, "Email", user.email);
    detailRow(cdl, "City", user.city);
    detailRow(cdl, "State", user.state);
    detailRow(cdl, "Pincode", user.pincode);
    contact.append(ch, cdl);
    root.appendChild(contact);

    /* ---- address ---- */
    if (user.address) {
      const addr = document.createElement("div");
      addr.className = "card";
      const ah = document.createElement("h2");
      ah.className = "mb-2";
      ah.textContent = "Address";
      const at = document.createElement("p");
      at.className = "mb-0 break";
      at.textContent = user.address;
      addr.append(ah, at);
      root.appendChild(addr);
    }

    /* ---- about ---- */
    if (user.about) {
      const about = document.createElement("div");
      about.className = "card";
      const bhh = document.createElement("h2");
      bhh.className = "mb-2";
      bhh.textContent = "About me";
      const bt = document.createElement("p");
      bt.className = "mb-0 break";
      bt.textContent = user.about;
      about.append(bhh, bt);
      root.appendChild(about);
    }

    /* ---- last login ---- */
    const meta = document.createElement("p");
    meta.className = "muted mt-2";
    meta.textContent = "Last login: " + formatDate(user.lastLogin);
    root.appendChild(meta);
  })();
}

/* ------------------------------------------------------------------ */
/* /edit-profile  -  the update form + photo upload                    */
/* ------------------------------------------------------------------ */
function initEditProfile() {
  const form = document.getElementById("edit-form");
  if (!form) return;

  const isWelcome = new URLSearchParams(window.location.search).get("welcome") === "1";

  (async () => {
    const user = await requireSession();
    if (!user) return;

    renderNavbar();

    // Pre-fill every field from the current profile.
    for (const [id, value] of Object.entries({
      name: user.name,
      city: user.city,
      state: user.state,
      pincode: user.pincode,
      address: user.address,
      about: user.about,
    })) {
      const el = document.getElementById(id);
      if (el) el.value = value || "";
    }

    // Mobile and email are shown read-only (they are the account identity).
    const mobileView = document.getElementById("mobile-view");
    if (mobileView) mobileView.value = user.mobile || "";
    const emailView = document.getElementById("email-view");
    if (emailView) emailView.value = user.email || "";

    if (isWelcome) {
      const box = document.getElementById("welcome-banner");
      if (box) {
        box.className = "alert alert-info show";
        box.textContent = "Account ban gaya! Apni profile details bhar kar save karein.";
      }
    }

    // ---- photo upload ----
    const fileInput = document.getElementById("photo-input");
    const preview = document.getElementById("photo-preview");
    const photoStatus = document.getElementById("photo-status");

    // Show the current photo straight away.
    if (preview) {
      preview.innerHTML = "";
      preview.appendChild(avatarEl(user.photo, user.name, true));
    }

    fileInput?.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;

      // Mirror the server's rules here purely to give instant feedback; the
      // server re-checks everything regardless, so a bypass gains nothing.
      if (!["image/jpeg", "image/png"].includes(file.type)) {
        toast("Sirf JPG ya PNG photo allowed hai.", "error");
        fileInput.value = "";
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast("Photo 2MB se chhoti honi chahiye.", "error");
        fileInput.value = "";
        return;
      }

      // Instant local preview while the upload is in flight.
      if (preview) {
        preview.innerHTML = "";
        const img = document.createElement("img");
        img.className = "avatar avatar-lg";
        img.src = URL.createObjectURL(file); // blob: is allowed by our CSP
        img.alt = "Selected photo";
        preview.appendChild(img);
      }

      const fd = new FormData();
      fd.append("photo", file);

      if (photoStatus) {
        photoStatus.innerHTML = "";
        const sp = document.createElement("span");
        sp.className = "spinner spinner-dark";
        const t = document.createElement("span");
        t.textContent = " Photo upload ho rahi hai...";
        photoStatus.append(sp, t);
      }

      const res = await api("/api/profile/photo", { method: "POST", formData: fd });

      if (photoStatus) photoStatus.textContent = "";

      if (res.ok) {
        toast(res.message || "Photo upload ho gayi!", "success");
        clearSessionCache();
        await renderNavbar();
      } else {
        // Put the old photo back since the upload failed.
        if (preview) {
          preview.innerHTML = "";
          preview.appendChild(avatarEl(user.photo, user.name, true));
        }
        toast(res.message || "Photo upload nahi hui.", "error");
        fileInput.value = "";
      }
    });

    // ---- save the rest of the form ----
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      clearAllErrors(form);

      // Client-side checks first.
      let bad = false;
      const fail = (id, msg) => { setFieldError(id, msg); bad = true; };

      const name = document.getElementById("name").value;
      const pincode = document.getElementById("pincode").value.trim();

      if (name.trim().length < 2) fail("name", "Naam kam se kam 2 characters ka hona chahiye.");
      if (pincode && !/^\d{6}$/.test(pincode)) fail("pincode", "Pincode 6 digit ka hona chahiye (ya khaali chhodein).");

      if (bad) { toast("Kuch fields check karein.", "error"); return; }

      const reset = setLoading(form.querySelector("button[type=submit]"), true);

      const res = await api("/api/profile", {
        method: "PUT",
        body: {
          name: name.trim(),
          city: document.getElementById("city").value.trim(),
          state: document.getElementById("state").value.trim(),
          pincode,
          address: document.getElementById("address").value.trim(),
          about: document.getElementById("about").value.trim(),
        },
      });

      reset();

      if (res.ok) {
        clearSessionCache();
        toast(res.message || "Profile update ho gaya!", "success");
        setTimeout(() => { window.location.href = "/profile"; }, 700);
      } else {
        applyServerErrors(form, res);
      }
    });
  })();
}

document.addEventListener("DOMContentLoaded", () => {
  initProfileView();
  initEditProfile();
});
