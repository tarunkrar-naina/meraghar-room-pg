# MeraGhar Auth — Authentication & User Profile System

A complete, production-shaped signup / login / profile flow built the way
JustDial and OLX do it. Plain HTML + CSS + vanilla JS on the front, Express on
the back, **Supabase (Postgres)** for storage, JWT in an httpOnly cookie plus
bcrypt for passwords.

> **Database note.** The original brief asked for MongoDB + Mongoose.
> Mongoose is a MongoDB-only ODM — it has no Postgres driver and cannot talk to
> Supabase at all. This project therefore stores everything in **Supabase
> Postgres** using the official `@supabase/supabase-js` client. Every security
> feature asked for (bcrypt, JWT, httpOnly cookies, helmet, rate limiting,
> server-side validation, protected routes) is implemented exactly as
> specified. No functionality was dropped.

---

## Tech stack

| Layer      | Technology |
|------------|------------|
| Backend    | Node.js + Express 4 |
| Database   | Supabase (Postgres) via `@supabase/supabase-js` |
| Auth       | JWT in an httpOnly cookie + `bcryptjs` |
| Validation | `express-validator` (server) + plain JS (browser) |
| Security   | helmet, cors, express-rate-limit |
| Uploads    | multer (JPG/PNG, max 2 MB) |
| Frontend   | Plain HTML / CSS / vanilla JS — no framework, no build step |

---

## 1. Install

```bash
cd auth-app
npm install
```

This installs everything listed in `package.json`. `nodemon` comes in as a dev
dependency for `npm run dev`.

---

## 2. Create the database tables

Supabase's REST API can read and write rows but **cannot create tables**, so
this one step is done by hand, once.

1. Open your Supabase project → **SQL Editor** → **New query**
2. Open `supabase/schema.sql` from this folder, copy the whole file
3. Paste it in and press **Run**

You should see `success. No rows returned`. That is correct.

> ⚠️ **The file drops and recreates the two tables.** That is deliberate and is
> how the camelCase column names (`passwordHash`, `createdAt`, `userId`) get
> created correctly — Postgres silently lower-cases unquoted identifiers, which
> breaks every login. You only ever need to run it once. If you ever re-run it,
> any accounts created in this app are deleted first.

The script creates two tables:

- **`auth_users`** — `id, name, mobile, email, passwordHash, createdAt, lastLogin`
- **`auth_profiles`** — `userId` (PK + FK), `photo, name, city, state, pincode, address, about, createdAt, updatedAt`

> The `auth_` prefix is deliberate. Your Supabase project **already has**
> `users` and `profiles` tables belonging to the MeraGhar website, and this
> schema does not touch them in any way.

Verify it worked:

```bash
npm run check
```

Expected: `[OK] Database schema is ready.`

---

## 3. Configure `.env`

```bash
copy .env.example .env
```

Fill in three values:

| Variable | Where to find it |
|----------|------------------|
| `SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → service_role |
| `JWT_SECRET` | generate one yourself (command below) |

Generate a strong JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

> **The service role key bypasses all database security.** It lives only in
> `.env`, which is gitignored. Never put it in anything under `/public` — that
> folder is sent to the browser.

---

## 4. Run it

```bash
npm start      # production
npm run dev    # auto-restart on file changes
```

Then open **<http://localhost:4000>**

---

## 5. Automated smoke test

With the server running in one terminal, open a second:

```bash
npm run smoke
```

It exercises the whole flow against the real database — signup, duplicate
rejection, wrong password, unknown account, login by mobile *and* by email,
profile update, invalid PIN rejection, photo type rejection, and logout — then
prints a pass/fail line for each check.

All 20 checks should read `[PASS]`.

### Or test it by hand

| # | Test | What to do | Expected |
|---|------|-----------|----------|
| 1 | Signup | `/signup` → fill all 5 fields → **Create account** | Redirects to `/edit-profile?welcome=1` with a success toast |
| 2 | Validation | Try a 9-digit mobile, or a bad email | Red inline errors under the fields, nothing sent to the server |
| 3 | Password mismatch | Enter different confirm passwords | "Dono password same hone chahiye." |
| 4 | Duplicate account | Sign up again with the same mobile | "Ye mobile number pehle se registered hai. Login karein." |
| 5 | Login | `/login` → mobile **or** email + password | Redirects to `/profile` |
| 6 | Wrong password | Any password you did not set | "Password galat hai." |
| 7 | Unknown account | A mobile that does not exist | "Ye mobile number ya email se koi account nahi mila." |
| 8 | Remember me | Tick **Remember me**, log in, close the tab, reopen | Homepage auto-redirects to `/profile` (cookie still valid) |
| 9 | Welcome back | Log out, then visit `/` | `/welcome` shows "Continue as **Your Name**" |
| 10 | One-click continue | Click the big **Continue as** button | `/login` opens with the mobile already filled in — only the password is needed |
| 11 | Different account | Click **Use a different account** | Cookie cleared; the welcome screen does not come back |
| 12 | Profile photo | `/edit-profile` → choose a JPG/PNG under 2 MB | Uploads to `/uploads`, navbar avatar updates |
| 13 | Reject bad photo | Try a PDF or a 3 MB image | "Sirf JPG ya PNG image allowed hai." / "Photo 2MB se chhoti honi chahiye." |
| 14 | Profile protection | Log out, then open `/profile` directly | Redirects to `/login` |
| 15 | Logout | Click **Logout** in the navbar | Back to the home page, session cookies cleared |

---

## Project structure

```
auth-app/
├── server.js                  # Express app, helmet, CORS, routes, boot
├── config/
│   ├── db.js                  # Supabase client + schema check
│   └── upload.js              # multer config (2 MB, jpg/png, random names)
├── models/
│   ├── User.js                # auth_users data access
│   └── Profile.js             # auth_profiles data access
├── routes/
│   ├── auth.js                # signup / login / logout / forget / me / remembered
│   └── profile.js             # read / update / photo (all behind requireAuth)
├── middleware/
│   ├── auth.js                # JWT sign + verify, requireAuth, optionalAuth
│   └── validate.js            # express-validator → 400 JSON
├── controllers/
│   ├── authController.js
│   └── profileController.js
├── public/
│   ├── index.html             # home
│   ├── signup.html            # /signup
│   ├── login.html             # /login
│   ├── welcome.html           # /welcome  — "Continue as [Name]"
│   ├── profile.html           # /profile  — view
│   ├── edit-profile.html      # /edit-profile — edit + photo upload
│   ├── forgot-password.html
│   ├── 404.html
│   ├── css/style.css          # blue/orange JustDial-style theme, responsive
│   ├── js/common.js           # fetch wrapper, toasts, spinner, navbar
│   ├── js/auth.js             # signup, login, welcome-back, home redirect
│   ├── js/profile.js          # profile view + edit + upload
│   └── uploads/               # uploaded photos (gitignored)
├── scripts/
│   ├── checkSchema.js         # npm run check
│   └── smoke.js               # npm run smoke - end-to-end test
├── supabase/schema.sql        # ← paste into Supabase SQL Editor
├── .env.example
└── package.json
```

---

## API reference

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/auth/signup` | — | Create account, hash password, auto-create profile, log in |
| POST | `/api/auth/login` | — | Mobile **or** email + password |
| POST | `/api/auth/logout` | — | Clear both cookies |
| POST | `/api/auth/forget` | — | Clear only the remembered-identifier cookie |
| GET | `/api/auth/me` | optional | Current user + profile, or `{ user: null }` |
| GET | `/api/auth/remembered` | — | Identifier + name for the Welcome-back screen |
| GET | `/api/profile` | required | Full profile |
| PUT | `/api/profile` | required | Update name, city, state, pincode, address, about |
| POST | `/api/profile/photo` | required | Upload photo (multer, field name `photo`) |
| GET | `/api/health` | — | Server + database status |

Every response uses one shape: `{ ok: true, ... }` or
`{ ok: false, code, message }`.

---

## Security notes

**Passwords** are hashed with bcrypt (12 rounds) before they touch the
database. Plaintext is never stored, logged, or returned.

**Sessions** use a JWT in an httpOnly, sameSite=lax cookie (plus `secure` in
production). JavaScript cannot read it, so an XSS bug cannot steal the session.
Expiry is **7 days with "Remember me", otherwise 1 day**.

**The "Continue as [Name]" button** deliberately does *not* log anyone in.
Doing that would require either storing the password in the browser or
skipping authentication entirely. Instead:

- valid JWT still present → **auto-login, nothing asked**
- only the identifier remembered → the Welcome-back screen, and clicking
  Continue fills the mobile in so only the password is typed

The user is *remembered*, but never *silently authenticated*.

**The remembered cookie stores only the mobile number or email** — never the
password, never the JWT.

**Rate limiting:** 10 attempts / 15 min on signup and login, 20 photo uploads
per 15 min.

**Input is validated twice** — in the browser for fast feedback, and again on
the server with express-validator, because anyone can POST to the API with
curl and skip the page entirely.

**Route protection:** `/api/profile/*` sits behind `requireAuth`, which
re-reads the user from the database on every request so a deleted account
loses access immediately instead of staying valid until the token expires. The
user id always comes from the JWT, never from the request body.

**Uploads** are limited to 2 MB and to JPG/PNG, checked by both MIME type and
extension, saved under a random filename so an attacker cannot traverse out of
`/uploads` or guess another user's file.

**Helmet CSP** is enabled with no inline scripts or styles — which is why the
JavaScript builds DOM with `createElement` and `textContent` and never
`innerHTML` with user data.

**Both tables have Row Level Security enabled with no policies**, meaning the
public anon key cannot read a single row. Everything must go through the
Express API.

---

## Troubleshooting

**"Database tables missing: auth_users, auth_profiles"**
Paste `supabase/schema.sql` into the Supabase SQL Editor and Run, then
`npm run check`.

**`column auth_users.passwordHash does not exist`**
The tables were created by an older version of `schema.sql` that did not quote
its camelCase column names, so Postgres stored them lower-cased. Re-run the
current `supabase/schema.sql` — it drops and recreates the tables with the
correct names. (Any accounts created in this app are lost; that is why the file
says so at the top.)

**"JWT_SECRET is not set"**
Copy `.env.example` to `.env` and set a long random value.

**Signup says the email is taken but you have never signed up**
An account already exists. Use **Login** instead, or **Use a different
account** on the welcome screen.

**"Bahut zyada koshish. 15 minute baad try karein."**
You hit the rate limit while testing. Restart the server to clear the
in-memory counter.

**Port 4000 already in use**
Change `PORT` in `.env`, or stop the other process:
`netstat -ano | findstr :4000` then `taskkill /PID <pid> /F`
