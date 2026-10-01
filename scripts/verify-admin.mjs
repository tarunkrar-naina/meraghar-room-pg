/**
 * Read-only smoke test for the admin panel against the live database.
 *
 * Runs every query the admin pages make, using the same service-role client the
 * server actions use. Also checks that anon cannot reach private tables.
 * Nothing is inserted, updated or deleted.
 *
 * Usage: node --env-file=.env.local scripts/verify-admin.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });
const anon = createClient(url, anonKey, { auth: { persistSession: false } });

let fail = 0;
let section = "";
const head = (s) => { section = s; console.log(`\n=== ${s} ===`); };
const ok = (l, n = "") => console.log(`  ok    ${l}${n ? "  " + n : ""}`);
const bad = (l, m) => { console.log(`  FAIL  [${section}] ${l}\n          ${m}`); fail++; };

async function head1(label, run, note) {
  const { count, error } = await run();
  error ? bad(label, error.message) : ok(label, note ? note(count) : `count=${count}`);
}
async function rows(label, run) {
  const { data, error } = await run();
  error ? bad(label, error.message) : ok(label, `rows=${data?.length ?? 0}`);
}

// ---------------------------------------------------------------- schema
head("tables");
for (const t of [
  "profiles", "properties", "property_images", "localities", "locations",
  "requirements", "contact_requests", "reports", "favorites",
  "property_views", "contact_reveals", "payments",
  "site_settings", "admin_audit_log", "admin_deployments",
]) {
  await head1(t, () => db.from(t).select("*", { count: "exact", head: true }));
}

// ------------------------------------------------------------ rpc helpers
head("functions");
await rows("get_table_row_counts", () => db.rpc("get_table_row_counts"));
{
  // get_site_settings returns a json object, not rows - count its keys.
  const { data, error } = await db.rpc("get_site_settings");
  const n = Object.keys(data ?? {}).length;
  error ? bad("get_site_settings", error.message) : ok("get_site_settings", `keys=${n}`);
}

// -------------------------------------------------------- dashboard stats
head("dashboard counters");
await head1("properties total", () => db.from("properties").select("id", { count: "exact", head: true }));
await head1("properties pending", () => db.from("properties").select("id", { count: "exact", head: true }).eq("status", "pending"));
await head1("properties approved", () => db.from("properties").select("id", { count: "exact", head: true }).eq("status", "approved"));
await head1("profiles total", () => db.from("profiles").select("id", { count: "exact", head: true }));
await head1("reports open", () => db.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"));
await head1("localities total", () => db.from("localities").select("id", { count: "exact", head: true }));
await head1("contact_requests total", () => db.from("contact_requests").select("id", { count: "exact", head: true }));
await head1("requirements open", () => db.from("requirements").select("id", { count: "exact", head: true }).eq("status", "open"));

// ----------------------------------------------------------- list pages
head("admin list pages (embedded resources)");
await rows("properties list", () => db.from("properties")
  .select("id, slug, title, purpose, property_type, price, status, is_featured, is_verified, city, locality, created_at, owner:profiles!properties_owner_id_fkey(name, phone), property_images(image_url)")
  .order("created_at", { ascending: false }).limit(250));
await rows("users list", () => db.from("profiles")
  .select("id, name, email, phone, role, is_blocked, created_at")
  .order("created_at", { ascending: false }).limit(500));
await rows("reports list", () => db.from("reports")
  .select("id, property_id, reason, status, created_at, property:properties(title), reporter:profiles!reports_reported_by_fkey(name)")
  .order("created_at", { ascending: false }).limit(200));
await rows("localities list", () => db.from("localities").select("id, city, locality").order("city").order("locality"));
await rows("locations list", () => db.from("locations").select("*").order("type").order("name"));
await rows("requirements list", () => db.from("requirements")
  .select("id, title, description, city, locality, property_type, purpose, budget_min, budget_max, contact_preference, status, created_at, poster:profiles!requirements_user_id_fkey(name, phone)")
  .order("created_at", { ascending: false }).limit(250));
await rows("leads list (3-level embed)", () => db.from("contact_requests")
  .select("id, name, phone, message, source, created_at, property:properties!contact_requests_property_id_fkey(title, owner:profiles!properties_owner_id_fkey(name, phone)), requirement:requirements!contact_requests_requirement_id_fkey(title, poster:profiles!requirements_user_id_fkey(name, phone))")
  .order("created_at", { ascending: false }).limit(250));
await rows("deploy history", () => db.from("admin_deployments")
  .select("id, deployment_id, status, url, inspector_url, error_message, triggered_by, created_at, updated_at")
  .order("created_at", { ascending: false }).limit(10));
await rows("audit activity", () => db.from("admin_audit_log")
  .select("id, admin_email, action, target, details, created_at")
  .order("created_at", { ascending: false }).limit(20));

// ----------------------------------------------------------- edit page
head("property edit page");
{
  const { data: first } = await db.from("properties").select("id").order("created_at", { ascending: false }).limit(1);
  if (!first?.length) console.log("  --    no properties in db");
  else {
    const { data, error } = await db.from("properties")
      .select("*, property_images(id, image_url, display_order)").eq("id", first[0].id).maybeSingle();
    error ? bad("fetchAdminProperty", error.message)
          : ok("fetchAdminProperty", `images=${data?.property_images?.length ?? 0}`);
  }
}

// -------------------------------------------------------- content editor
head("content editor");
await rows("settings with defaults", () => db.from("site_settings").select('key, value, default_value, label, "group"'));
{
  const { data } = await db.from("site_settings").select("key,default_value");
  const missing = (data ?? []).filter((r) => r.default_value === null).map((r) => r.key);
  missing.length ? bad("default_value populated", `missing: ${missing.join(", ")}`)
                 : ok("default_value populated", `${data?.length ?? 0} rows`);
}

// ----------------------------------------------------------- db browser
head("database browser");
const BROWSER = [
  ["properties", "created_at", false, ["title"]],
  ["property_images", "created_at", false, ["image_url"]],
  ["profiles", "created_at", false, ["name", "email"]],
  ["localities", "city", true, ["locality"]],
  ["locations", "type", true, ["name"]],
  ["requirements", "created_at", false, ["title"]],
  ["contact_requests", "created_at", false, ["name", "phone"]],
  ["reports", "created_at", false, ["reason"]],
  ["favorites", "created_at", false, []],
  ["property_views", "viewed_at", false, ["device_type"]],
  ["contact_reveals", "revealed_at", false, []],
  ["payments", "created_at", false, ["razorpay_order_id"]],
  ["site_settings", "key", true, ["label"]],
];
for (const [table, orderBy, asc, searchCols] of BROWSER) {
  const { count, error } = await db.from(table).select("*", { count: "exact" })
    .order(orderBy, { ascending: asc }).range(0, 24);
  if (error) { bad(`${table} rows`, error.message); continue; }
  if (searchCols.length) {
    const { error: se } = await db.from(table).select("*")
      .or(searchCols.map((c) => `${c}.ilike.%smoke%`).join(",")).limit(1);
    if (se) { bad(`${table} search`, se.message); continue; }
  }
  ok(table, `rows=${count}`);
}

// ------------------------------------------------------------------ RLS
head("RLS (anon key must not reach private tables)");
// site_settings is public by design - the footer/hero copy is meant to be
// readable - but it is served through the service-role client, so an anon read
// succeeding here is informational, not a failure.
for (const t of ["profiles", "admin_audit_log", "admin_deployments", "payments", "contact_reveals", "property_views"]) {
  const { data, error } = await anon.from(t).select("*").limit(1);
  (data?.length ?? 0) > 0 ? bad(`anon ${t}`, `returned ${data.length} rows`) : ok(`anon ${t}`, error ? "blocked" : "0 rows");
}
await rows("anon localities (property form)", () => anon.from("localities").select("*").order("city").order("locality"));
for (const t of ["site_settings"]) {
  const { data, error } = await anon.from(t).select("*").limit(1);
  console.log(`  note  anon ${t}: ${error ? "blocked" : `${data?.length ?? 0} rows (public by design, served via service role)`}`);
}

// ------------------------------------------------------------ admin roles
head("admin roles");
{
  const { data, error } = await db.from("profiles").select("email,role").eq("role", "admin");
  if (error) bad("list admins", error.message);
  else {
    for (const a of data ?? []) console.log(`  ok    ${a.email} -> ${a.role}`);
    if (!(data ?? []).length) bad("list admins", "no admin profiles found");
  }
}

// --------------------------------------------------------- deploy config
head("deploy config");
for (const k of ["VERCEL_TOKEN", "VERCEL_PROJECT_ID", "VERCEL_ORG_ID", "VERCEL_TEAM_ID"]) {
  const v = process.env[k];
  console.log(`  ${v ? "ok   " : "MISS "} ${k}${v ? "" : "   <- deploy button disabled"}`);
}

console.log(`\n${fail === 0 ? "ALL ADMIN CHECKS PASSED" : `${fail} FAILURE(S)`}`);
process.exit(fail === 0 ? 0 : 1);
