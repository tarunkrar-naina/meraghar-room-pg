-- =====================================================================
-- MeraGhar Auth - Database schema (Supabase / Postgres)
-- ---------------------------------------------------------------------
-- HOW TO APPLY
--   1. Supabase Dashboard > SQL Editor > New query
--   2. Paste this ENTIRE file
--   3. Press "Run"
--   4. Back in VS Code:  npm run check     (confirms the tables exist)
--   5. npm start
--
-- IMPORTANT - READ BEFORE RE-RUNNING
--   This file DROPS and recreates auth_users / auth_profiles. That is what
--   makes the camelCase column names below work (see the note further down).
--   Only run it when you are willing to lose any accounts already created in
--   a previous, broken run. For normal day-to-day use you never re-run it.
--
-- IMPORTANT - TABLE NAMING
--   This project deliberately uses `auth_users` and `auth_profiles`.
--   Your Supabase project ALREADY has `users` and `profiles` tables that
--   belong to the MeraGhar website (the `profiles` table holds real accounts
--   and admin roles). Those tables are NOT touched here in any way. The
--   prefix keeps the two systems completely separate.
-- =====================================================================


-- ---------------------------------------------------------------------
-- 0. Remove the old tables, if they exist
-- ---------------------------------------------------------------------
-- auth_profiles holds the foreign key, so it has to go first.
drop view if exists public.auth_accounts;
drop table if exists public.auth_profiles;
drop table if exists public.auth_users;


-- ---------------------------------------------------------------------
-- A NOTE ON QUOTED COLUMN NAMES  (this is the important bit)
-- ---------------------------------------------------------------------
-- Postgres folds UNQUOTED identifiers to lower case. So this:
--       create table t ( passwordHash text );
-- actually creates a column called  passwordhash , not passwordHash.
--
-- That matters because the server talks to Postgres through PostgREST, and
-- the JS client asks for columns by their exact name. A lowercase
-- `passwordhash` would fail every login with:
--       "column auth_users.passwordHash does not exist"
--
-- Quoting each camelCase name keeps it camelCase everywhere. It is the only
-- reason these identifiers have quotes around them - `id`, `name`, `mobile`,
-- `email`, `city` and friends are all lowercase already, so they look normal.


-- ---------------------------------------------------------------------
-- 1. auth_users  -  login accounts and credentials
-- ---------------------------------------------------------------------
create table public.auth_users (
  -- Postgres generates the UUID, so the app never has to invent ids.
  id             uuid        primary key default gen_random_uuid(),

  name           text        not null,
  mobile         text        not null,
  email          text        not null,

  -- bcrypt hash. The plaintext password is NEVER written to the database.
  "passwordHash" text        not null,

  "createdAt"    timestamptz not null default now(),
  "lastLogin"    timestamptz not null default now(),

  -- One account per mobile number and per email. These constraints are the
  -- real guarantee behind "prevent duplicate accounts" - the application
  -- check is only for a friendly error message, this is what actually stops
  -- a duplicate, even if two signups race each other at the same moment.
  constraint auth_users_mobile_unique unique (mobile),
  constraint auth_users_email_unique  unique (email),

  -- Indian mobile: 10 digits, first digit 6-9.
  constraint auth_users_mobile_format check (mobile ~ '^[6-9][0-9]{9}$')
);

-- The login form looks users up by mobile OR email, so index both.
create index idx_auth_users_email  on public.auth_users (email);
create index idx_auth_users_mobile on public.auth_users (mobile);


-- ---------------------------------------------------------------------
-- 2. auth_profiles  -  public profile details, 1-to-1 with auth_users
-- ---------------------------------------------------------------------
create table public.auth_profiles (
  -- Using the same column as the primary key makes the 1-to-1 relationship
  -- structurally impossible to break: a user simply cannot have two profiles.
  "userId"   uuid        primary key
                        references public.auth_users(id) on delete cascade,

  photo      text,                    -- /uploads/xxxx.jpg, created by multer
  name       text        not null default '',  -- display name, mirrors auth_users
  city       text        not null default '',
  state      text        not null default '',
  pincode    text        not null default '',  -- text, so "012345" keeps its 0
  address    text        not null default '',
  about      text        not null default '',

  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),

  -- Same 6-digit Indian PIN rule. Empty is allowed so a partial profile saves.
  constraint auth_profiles_pincode_format check (pincode = '' or pincode ~ '^[0-9]{6}$')
);

create index idx_auth_profiles_city on public.auth_profiles (city);


-- ---------------------------------------------------------------------
-- 3. Row Level Security - lock these tables down completely
-- ---------------------------------------------------------------------
-- The server connects with the SERVICE ROLE key, which bypasses RLS by design,
-- so it can still read and write everything.
--
-- Enabling RLS and deliberately creating NO policy for `anon` or
-- `authenticated` means the public anon key can do NOTHING to these tables.
-- That matters because NEXT_PUBLIC_SUPABASE_ANON_KEY is visible in browser
-- code - if someone pastes it into the console, they still cannot read a
-- single account or password hash out of the database.
alter table public.auth_users    enable row level security;
alter table public.auth_profiles enable row level security;

-- No policies are added on purpose. No policy == deny everything.
-- If you ever add one here, the server keeps working but you have opened a
-- hole; everything should go through the Express API and its auth middleware.


-- ---------------------------------------------------------------------
-- 4. A helper view that joins an account to its profile
-- ---------------------------------------------------------------------
-- Purely for convenience when inspecting data in the Supabase dashboard.
-- The app itself does not use it.
create view public.auth_accounts
with (security_invoker = true) as
select
  u.id,
  u.name,
  u.mobile,
  u.email,
  u."createdAt",
  u."lastLogin",
  p.photo,
  p.city,
  p.state,
  p.pincode,
  p.address,
  p.about
from public.auth_users u
left join public.auth_profiles p on p."userId" = u.id;
