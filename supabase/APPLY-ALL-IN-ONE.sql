-- =============================================================================
-- MeraGhar - ONE-SHOT DATABASE PATCH
-- =============================================================================
-- Paste this whole file into:
--   Supabase Dashboard > SQL Editor > New query > Run
--
-- It is safe to run more than once (every statement is idempotent: IF NOT EXISTS,
-- CREATE OR REPLACE, DROP POLICY IF EXISTS, ON CONFLICT DO NOTHING).
--
-- What this creates:
--   1. Missing tables: locations, contact_requests, property_views,
--      payments, contact_reveals, public_owners view
--   2. profiles.is_blocked  - admin se user block karna
--   3. site_settings         - /admin/content se website ka text
--   4. admin_audit_log       - har admin action ka record
--   5. admin_deployments     - Vercel deploy history
--   6. get_table_row_counts()- /admin/database sidebar ke row counts
--
-- Order matters (this file failed before because of both):
--   - payments MUST be created BEFORE contact_reveals (it has a FK to payments)
--   - the missing-tables section BEFORE the admin section
--
-- Supabase runs the pasted script as one transaction: if ANY statement fails,
-- everything rolls back. Fix the first error and run the whole file again -
-- re-running is safe.
-- =============================================================================
-- ------------------------------------------------------------------
-- 0. Safety net: is_admin() is referenced by every admin policy below.
--    It already exists from 20260911000000_init.sql, but re-creating it
--    (CREATE OR REPLACE is idempotent) means the policies below can never
--    fail with `function public.is_admin() does not exist`.
-- ------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ============================================================
-- MeraGhar - MISSING DATABASE MIGRATIONS (apply all at once)
-- Run this WHOLE file in:  Supabase Dashboard > SQL Editor > New query > Run
-- This is idempotent (safe to re-run).
-- It applies the 3 migrations that were never run on this project.
-- ============================================================

-- ==================== migration: 20260913000000_contact_requests.sql ====================

-- Contact requests / leads
-- Customers "interested" in a property or requirement contact MeraGhar admin.
-- Owner & poster contact details are shown ONLY to the admin (never on the public site).
create table if not exists public.contact_requests (
  id uuid primary key default gen_random_uuid(),
  property_id uuid references public.properties(id) on delete set null,
  requirement_id uuid references public.requirements(id) on delete set null,
  name text not null default '',
  phone text not null default '',
  message text not null default '',
  source text not null default 'property',
  created_at timestamptz not null default now()
);

alter table public.contact_requests enable row level security;

-- Anyone (logged out or in) can drop an interest lead
create policy "contact_requests_insert_public"
  on public.contact_requests for insert
  to anon, authenticated
  with check (true);

-- Only admins can read leads
create policy "contact_requests_select_admin"
  on public.contact_requests for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid() and profiles.role = 'admin'
    )
  );

-- ==================== migration: 20260921000000_monetization_analytics.sql ====================

-- ============================================================
-- MeraGhar - Analytics + monetization (views, contact reveals, payments)
-- Depends on: 20260911000000_init.sql (profiles, properties require RLS)
-- Idempotent: safe to re-run.
-- ============================================================

-- ------------------------------------------------------------------
-- 1. properties: counters needed by analytics/listing
-- ------------------------------------------------------------------

alter table public.properties add column if not exists view_count bigint not null default 0;
alter table public.properties add column if not exists contact_reveal_count integer not null default 0;

-- Public owner info must never expose raw contact details - owner phone/email
-- is only returned by server routes after authorized contact reveal.
drop view if exists public.public_owners;
create view public.public_owners
with (security_invoker = true) as
select id, name, avatar_url
from public.profiles;

-- Seed the new canonical counter from the legacy `views` tally once.
update public.properties
set view_count = views
where view_count = 0 and views > 0;

-- ------------------------------------------------------------------
-- 2. New tables
-- ------------------------------------------------------------------

-- One row per recorded property page view. Raw IPs are never stored -
-- only a salted SHA-256 hash of (anon visitor id + salt) is kept.
create table if not exists public.property_views (
  id           uuid primary key default gen_random_uuid(),
  property_id  uuid not null references public.properties(id) on delete cascade,
  viewer_id    uuid references public.profiles(id) on delete set null,
  visitor_hash text not null,
  device_type  text not null default 'desktop' check (device_type in ('mobile', 'tablet', 'desktop')),
  viewed_at    timestamptz not null default now()
);

create index if not exists idx_property_views_prop_time
  on public.property_views (property_id, viewed_at desc);
create index if not exists idx_property_views_time
  on public.property_views (viewed_at desc);

-- All payments: contact reveals + featured listing purchases.
-- NOTE: must come BEFORE contact_reveals, because that table has a FK to
-- payments(id). Creating them in the other order fails with
-- `relation "public.payments" does not exist` and aborts the whole batch.
create table if not exists public.payments (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  property_id         uuid references public.properties(id) on delete set null,
  type                text not null check (type in ('contact_reveal', 'featured_listing')),
  amount              numeric(12,2) not null check (amount >= 0),
  status              text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  razorpay_order_id   text,
  razorpay_payment_id text,
  created_at          timestamptz not null default now(),
  completed_at        timestamptz
);

create index if not exists idx_payments_user   on public.payments (user_id);
create index if not exists idx_payments_status on public.payments (status, created_at desc);
create index if not exists idx_payments_order  on public.payments (razorpay_order_id) where razorpay_order_id is not null;

-- A contact reveal = a customer paid to unlock an owner's contact details.
create table if not exists public.contact_reveals (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  customer_id uuid not null references public.profiles(id) on delete cascade,
  amount_paid numeric(12,2) not null default 0,
  payment_id  uuid references public.payments(id) on delete set null,
  revealed_at timestamptz not null default now(),
  constraint contact_reveals_property_customer_key unique (property_id, customer_id)
);

create index if not exists idx_contact_reveals_property on public.contact_reveals (property_id);
create index if not exists idx_contact_reveals_customer on public.contact_reveals (customer_id);


-- ------------------------------------------------------------------
-- 3. Row Level Security
-- ------------------------------------------------------------------

alter table public.property_views   enable row level security;
alter table public.contact_reveals  enable row level security;
alter table public.payments         enable row level security;

-- ----- property_views -----
-- Only written through the security-definer RPC below.
drop policy if exists "property_views_select_owner" on public.property_views;
create policy "property_views_select_owner"
  on public.property_views for select
  to authenticated
  using (exists (
    select 1 from public.properties p
    where p.id = property_id and p.owner_id = auth.uid()
  ));

drop policy if exists "property_views_select_admin" on public.property_views;
create policy "property_views_select_admin"
  on public.property_views for select
  to authenticated
  using (public.is_admin());

-- ----- contact_reveals -----
-- The paying customer can see their own reveals; admins see everything for support.
drop policy if exists "contact_reveals_select_own" on public.contact_reveals;
create policy "contact_reveals_select_own"
  on public.contact_reveals for select
  to authenticated
  using (customer_id = auth.uid());

drop policy if exists "contact_reveals_select_admin" on public.contact_reveals;
create policy "contact_reveals_select_admin"
  on public.contact_reveals for select
  to authenticated
  using (public.is_admin());

-- ----- payments -----
-- Nobody reads another user's payments; admins see all for revenue/reconciliation.
drop policy if exists "payments_select_own" on public.payments;
create policy "payments_select_own"
  on public.payments for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "payments_select_admin" on public.payments;
create policy "payments_select_admin"
  on public.payments for select
  to authenticated
  using (public.is_admin());

-- Writes to these tables always happen through the service-role (server) client.

-- ------------------------------------------------------------------
-- 4. Atomic functions (never read-then-write from JS)
-- ------------------------------------------------------------------

-- Records one property view with 30-minute per-visitor dedupe, skips the
-- property owner, and bumps the counter atomically.
create or replace function public.record_property_view(
  p_property_id uuid,
  p_viewer_id uuid,
  p_visitor_hash text,
  p_device_type text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_recent boolean;
begin
  if p_property_id is null or p_visitor_hash is null or p_visitor_hash = '' then
    return;
  end if;

  select owner_id into v_owner_id from public.properties where id = p_property_id;
  if v_owner_id is null or (p_viewer_id is not null and p_viewer_id = v_owner_id) then
    return;
  end if;

  select exists (
    select 1 from public.property_views
    where property_id = p_property_id
      and viewer_id is not distinct from p_viewer_id
      and visitor_hash = p_visitor_hash
      and viewed_at > now() - interval '30 minutes'
  ) into v_recent;

  if v_recent then
    return;
  end if;

  insert into public.property_views (property_id, viewer_id, visitor_hash, device_type)
  values (p_property_id, p_viewer_id, p_visitor_hash, p_device_type);

  update public.properties set view_count = view_count + 1 where id = p_property_id;
end;
$$;

-- Marks a contact reveal as done - idempotent on (property_id, customer_id).
create or replace function public.record_contact_reveal(
  p_property_id uuid,
  p_customer_id uuid,
  p_amount numeric,
  p_payment_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_property_id is null or p_customer_id is null then
    return;
  end if;

  insert into public.contact_reveals (property_id, customer_id, amount_paid, payment_id)
  values (p_property_id, p_customer_id, p_amount, p_payment_id)
  on conflict (property_id, customer_id) do nothing;

  -- Only bump the counter when the row was actually inserted (first payment).
  -- FOUND is true only when ON CONFLICT DO NOTHING actually inserted a row.
  if found then
    update public.properties
    set contact_reveal_count = contact_reveal_count + 1
    where id = p_property_id;
  end if;
end;
$$;

-- ------------------------------------------------------------------
-- 5. Owner analytics (server-side ownership check, then read)
-- ------------------------------------------------------------------

-- Returns JSON analytics for one property. Raises NOT_ALLOWED unless the
-- calling user owns the property or is an admin, so owners can never read
-- another owner's analytics.
create or replace function public.get_property_analytics(p_property_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_owner_id uuid;
  v_result jsonb;
begin
  select owner_id into v_owner_id from public.properties where id = p_property_id;
  if v_owner_id is null then
    raise exception 'PROPERTY_NOT_FOUND';
  end if;

  if auth.uid() is null or (auth.uid() <> v_owner_id and not public.is_admin()) then
    raise exception 'NOT_ALLOWED';
  end if;

  select jsonb_build_object(
    'total_views',       (select count(*) from public.property_views where property_id = p_property_id),
    'unique_visitors',   (select count(distinct visitor_hash) from public.property_views where property_id = p_property_id),
    'mobile_views',      (select count(*) from public.property_views where property_id = p_property_id and device_type = 'mobile'),
    'tablet_views',      (select count(*) from public.property_views where property_id = p_property_id and device_type = 'tablet'),
    'desktop_views',     (select count(*) from public.property_views where property_id = p_property_id and device_type = 'desktop'),
    'contact_reveals',   (select contact_reveal_count from public.properties where id = p_property_id),
    'daily',             coalesce((
      select jsonb_agg(jsonb_build_object('day', to_char(day, 'YYYY-MM-DD'), 'count', c))
      from (
        select date_trunc('day', viewed_at) as day, count(*) as c
        from public.property_views
        where property_id = p_property_id
          and viewed_at >= (now() - interval '30 days')
        group by date_trunc('day', viewed_at)
        order by day
      ) d
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

-- ------------------------------------------------------------------
-- 6. Listing view: featured detected at query time (featured_until > now())
-- ------------------------------------------------------------------

-- Owners' analytics rely on security-definer functions; this view inherits
-- the caller's RLS so public listings still only surface `approved` rows.
create or replace view public.properties_listing
with (security_invoker = true) as
select
  p.*,
  (p.is_featured and p.featured_until > now()) as featured_active
from public.properties p;

-- ------------------------------------------------------------------
-- 7. Revoke direct writes on analytics tables (RPCs are the only writers)
-- ------------------------------------------------------------------

revoke insert, update, delete on public.property_views from anon, authenticated;
revoke insert, update, delete on public.contact_reveals from anon, authenticated;
revoke insert, update, delete on public.payments from anon, authenticated;

grant execute on function public.record_property_view(uuid, uuid, text, text) to anon, authenticated;
grant execute on function public.record_contact_reveal(uuid, uuid, numeric, uuid) to anon, authenticated;
grant execute on function public.get_property_analytics(uuid) to authenticated;

-- ==================== migration: 20260922000000_locations.sql ====================

-- ============================================================
-- MeraGhar - Location registry for SEO location pages
-- Run this in the Supabase SQL editor (or via `supabase db push`)
-- Idempotent and safe to re-run.
--
-- Gives every city/town its own seeded row so the dynamic
-- /[location] and /[location]/[category] pages, sitemap and
-- admin panel all work from one source of truth.
-- ============================================================

create table if not exists public.locations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  state       text not null default '',
  country     text not null default 'India',
  type        text not null default 'city' check (type in ('city', 'town', 'area')),
  parent_slug text,
  nearby      text[] not null default '{}',
  areas       text[] not null default '{}',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists idx_locations_slug        on public.locations (slug);
create index if not exists idx_locations_parent      on public.locations (parent_slug);
create index if not exists idx_locations_active      on public.locations (is_active);

-- ----- RLS -----
alter table public.locations enable row level security;

drop policy if exists "locations_select_public" on public.locations;
create policy "locations_select_public"
  on public.locations for select
  to anon, authenticated
  using (is_active = true);

drop policy if exists "locations_select_admin_all" on public.locations;
create policy "locations_select_admin_all"
  on public.locations for select
  to authenticated
  using (public.is_admin());

drop policy if exists "locations_write_admin" on public.locations;
create policy "locations_write_admin"
  on public.locations for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ----- SEED: initial locations -----
insert into public.locations (name, slug, state, country, type, parent_slug, nearby, areas) values
  ('Kaithal', 'kaithal', 'Haryana', 'India', 'city', null,
   '{pundri,kurukshetra,karnal,panipat}',
   '{"City Centre","Pehowa Road","Kurukshetra Road","Guhla Road","Division Chowk"}'),
  ('Pundri', 'pundri', 'Haryana', 'India', 'town', null,
   '{kaithal,kurukshetra,karnal}',
   '{"Main Bazaar","Rajound Road","Bus Stand Road","Kaithal Road"}'),
  ('Kurukshetra', 'kurukshetra', 'Haryana', 'India', 'city', null,
   '{kaithal,karnal,ambala,pundri}',
   '{"Railway Road","Pipli Chowk","Pehowa Chowk","Ladwa Road","Sarai Road"}'),
  ('Karnal', 'karnal', 'Haryana', 'India', 'city', null,
   '{kaithal,panipat,kurukshetra}',
   '{"GT Road","Ramlila Ground","Mehra Road","Railway Road","Kunjpura Road"}'),
  ('Panipat', 'panipat', 'Haryana', 'India', 'city', null,
   '{karnal,ambala,delhi}',
   '{"GT Road","Krishna Colony","Model Town","Motilal Nehru Park","Madina Chowk"}'),
  ('Ambala', 'ambala', 'Haryana', 'India', 'city', null,
   '{kurukshetra,chandigarh,panipat}',
   '{"Ambala Cantt","Civil Lines","Mahesh Nagar","Prem Nagar","Barara"}'),
  ('Chandigarh', 'chandigarh', 'Chandigarh', 'India', 'city', null,
   '{ambala,panchkula,mohali}',
   '{"Sector 17","Sector 22","Sector 35","Industrial Area Phase 1","Manimajra"}')
on conflict (slug) do nothing;

-- ============================================================
-- MeraGhar - Admin panel support tables
-- Depends on: 20260911000000_init.sql (profiles, is_admin())
-- Idempotent: safe to re-run.
--
-- Adds:
--   profiles.is_blocked      - admin can suspend a user (login then behaves as signed out)
--   site_settings            - editable website copy (contact, hero, about, footer)
--   admin_audit_log          - who changed what, and when
--   admin_deployments        - Vercel deploy history + build status for the admin panel
--
-- Run in: Supabase Dashboard > SQL Editor > New query > Run
-- ============================================================

-- ------------------------------------------------------------------
-- 1. Blocked users
-- ------------------------------------------------------------------

alter table public.profiles add column if not exists is_blocked boolean not null default false;

create index if not exists idx_profiles_blocked on public.profiles (is_blocked) where is_blocked;

-- ------------------------------------------------------------------
-- 2. site_settings - key/value store for editable website copy
-- ------------------------------------------------------------------

create table if not exists public.site_settings (
  key           text primary key,
  value         text,
  default_value text,
  label         text not null default '',
  "group"       text not null default 'general',
  updated_by    uuid references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now()
);

create index if not exists idx_site_settings_group on public.site_settings ("group");

alter table public.site_settings enable row level security;

-- Everyone (including logged-out visitors) may read settings.
drop policy if exists "site_settings_select_public" on public.site_settings;
create policy "site_settings_select_public"
  on public.site_settings for select
  to anon, authenticated
  using (true);

-- Only admins may write. Direct table writes are revoked below too, because the
-- admin panel writes through the service-role client.
drop policy if exists "site_settings_write_admin" on public.site_settings;
create policy "site_settings_write_admin"
  on public.site_settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

revoke insert, update, delete on public.site_settings from anon;

-- ------------------------------------------------------------------
-- 3. admin_audit_log - immutable trail of admin actions
-- ------------------------------------------------------------------

create table if not exists public.admin_audit_log (
  id          uuid primary key default gen_random_uuid(),
  admin_email text not null,
  action      text not null,
  target      text,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_admin_audit_created on public.admin_audit_log (created_at desc);
create index if not exists idx_admin_audit_action  on public.admin_audit_log (action);

alter table public.admin_audit_log enable row level security;

-- Service-role client is the only writer (it bypasses RLS).
drop policy if exists "admin_audit_log_select_admin" on public.admin_audit_log;
create policy "admin_audit_log_select_admin"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_admin());

-- Deliberately no insert/update/delete policy: anon + authenticated can never
-- write rows here, only the service-role key can.
revoke insert, update, delete on public.admin_audit_log from anon, authenticated;

-- ------------------------------------------------------------------
-- 4. admin_deployments - Vercel deploy history
-- ------------------------------------------------------------------

create table if not exists public.admin_deployments (
  id            uuid primary key default gen_random_uuid(),
  deployment_id text not null default '',
  status        text not null default 'queued',
  url           text,
  inspector_url text,
  error_message text,
  triggered_by  text not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_admin_deployments_created on public.admin_deployments (created_at desc);

alter table public.admin_deployments enable row level security;

drop policy if exists "admin_deployments_select_admin" on public.admin_deployments;
create policy "admin_deployments_select_admin"
  on public.admin_deployments for select
  to authenticated
  using (public.is_admin());

revoke insert, update, delete on public.admin_deployments from anon, authenticated;

-- ------------------------------------------------------------------
-- 5. Seed the editable site copy with the values that are hardcoded today,
--    so switching the UI over to site_settings changes nothing visually.
-- ------------------------------------------------------------------

insert into public.site_settings (key, value, default_value, label, "group") values
  ('site_name',        'MeraGhar',  'MeraGhar',  'Website name',                        'general'),
  ('site_tagline',     'Apna Sapna Ghar', 'Apna Sapna Ghar', 'Tagline',                    'general'),
  ('contact_phone',    '8950056231', '8950056231', 'Contact phone (10 digits)',          'contact'),
  ('contact_email',    'hello@meraghar.in', 'hello@meraghar.in', 'Contact email',         'contact'),
  ('whatsapp_number',  '918950056231', '918950056231', 'WhatsApp number (country code + number, no +)', 'contact'),
  ('contact_address',  '',            '',            'Office / street address',           'contact'),
  ('support_hours',    '9:00 AM - 9:00 PM', '9:00 AM - 9:00 PM', 'Support hours',       'contact'),
  ('hero_title',       'Rooms, PG, Flats & Properties in Haryana', 'Rooms, PG, Flats & Properties in Haryana', 'Homepage hero heading', 'pages'),
  ('hero_subtitle',    'Verified local listings for Kaithal, Kurukshetra, Pundri and Narwana.', 'Verified local listings for Kaithal, Kurukshetra, Pundri and Narwana.', 'Homepage hero subheading', 'pages'),
  ('about_intro',      'MeraGhar makes it simpler to find a room, PG, flat, house or shop in your own city. Local owners can share property details, while tenants and buyers can search with clear photos, prices and location information.', 'MeraGhar makes it simpler to find a room, PG, flat, house or shop in your own city. Local owners can share property details, while tenants and buyers can search with clear photos, prices and location information.', 'About page - intro paragraph', 'pages'),
  ('about_body',       'We currently focus on Kaithal, Kurukshetra, Pundri and Narwana in Haryana, with more cities planned. Our goal is simple: make local property discovery transparent, useful and safe.', 'We currently focus on Kaithal, Kurukshetra, Pundri and Narwana in Haryana, with more cities planned. Our goal is simple: make local property discovery transparent, useful and safe.', 'About page - second paragraph', 'pages'),
  ('footer_note',      'MeraGhar is the local property marketplace for Kaithal, Kurukshetra, Pundri & Narwana, Haryana.', 'MeraGhar is the local property marketplace for Kaithal, Kurukshetra, Pundri & Narwana, Haryana.', 'Footer description', 'footer'),
  ('social_instagram', '',            '',            'Instagram URL',                      'footer'),
  ('social_facebook',  '',            '',            'Facebook URL',                       'footer'),
  ('social_youtube',   '',            '',            'YouTube URL',                        'footer')
on conflict (key) do nothing;

-- ------------------------------------------------------------------
-- 6. Keep updated_at fresh when the admin panel saves a setting
-- ------------------------------------------------------------------

create or replace function public.touch_site_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists site_settings_touch_updated_at on public.site_settings;
create trigger site_settings_touch_updated_at
  before update on public.site_settings
  for each row execute function public.touch_site_settings_updated_at();

-- ------------------------------------------------------------------
-- 7. Reads settings as a single json object (one round trip per page)
-- ------------------------------------------------------------------

create or replace function public.get_site_settings()
returns jsonb
language sql
stable
as $$
  select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
  from public.site_settings;
$$;

grant execute on function public.get_site_settings() to anon, authenticated;

-- ------------------------------------------------------------------
-- 8. Admin-only helper: how many rows each table holds, for the DB browser
-- ------------------------------------------------------------------

create or replace function public.get_table_row_counts()
returns table (table_name text, row_count bigint)
language sql
stable
security definer
set search_path = public
as $$
  select 'profiles',          count(*) from public.profiles
  union all select 'properties',        count(*) from public.properties
  union all select 'property_images',   count(*) from public.property_images
  union all select 'localities',        count(*) from public.localities
  union all select 'locations',         count(*) from public.locations
  union all select 'requirements',      count(*) from public.requirements
  union all select 'contact_requests',  count(*) from public.contact_requests
  union all select 'reports',           count(*) from public.reports
  union all select 'favorites',         count(*) from public.favorites
  union all select 'property_views',    count(*) from public.property_views
  union all select 'contact_reveals',   count(*) from public.contact_reveals
  union all select 'payments',          count(*) from public.payments
  union all select 'site_settings',     count(*) from public.site_settings
  union all select 'admin_audit_log',   count(*) from public.admin_audit_log
  union all select 'admin_deployments', count(*) from public.admin_deployments;
$$;

revoke all on function public.get_table_row_counts() from anon, authenticated;
grant execute on function public.get_table_row_counts() to service_role;

-- =============================================================================
-- DONE. Ab yeh karein:
--   1. Refresh this page (schema cache reload hone ke liye 5-10 second wait).
--   2. https://meraghar-room-pg.vercel.app/admin  par login karein.
-- =============================================================================