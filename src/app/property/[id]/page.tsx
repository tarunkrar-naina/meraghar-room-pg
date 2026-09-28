import { notFound, permanentRedirect } from "next/navigation";
import { resolvePropertyPath } from "@/lib/locations";
import { fetchPublicProperty } from "@/lib/queries";

/**
 * Legacy property URL: /property/{id} -> 308 to the canonical keyword path
 * /{city}/{category}/{slug}/
 *
 * permanentRedirect() returns 308, which search engines treat as permanent.
 * (next/navigation's redirect() is a temporary 307 and loses that signal.)
 */
export const dynamic = "force-dynamic";

export default async function LegacyPropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await fetchPublicProperty(id);
  if (!property) notFound();
  permanentRedirect(await resolvePropertyPath(property));
}
