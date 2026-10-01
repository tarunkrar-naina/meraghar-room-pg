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