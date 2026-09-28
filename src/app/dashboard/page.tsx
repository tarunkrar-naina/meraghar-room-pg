import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your MeraGhar listings, saved properties and requirements.",
};

export default async function DashboardPage() {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/dashboard");

  // Broker model: customers do NOT have a dashboard. Only the admin manages
  // the site from the separate /admin panel, so everyone lands back home.
  if (user.profile?.role !== "admin") redirect("/");
  redirect("/admin");
}