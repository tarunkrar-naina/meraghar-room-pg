import { notFound, permanentRedirect } from "next/navigation";
import { resolvePropertyPath } from "@/lib/locations";
import { fetchPublicProperty } from "@/lib/queries";

/**
 * Legacy two-segment property URL: /properties/{id}/{slug}
 * -> 308 to the canonical keyword path /{city}/{category}/{slug}/
 */
export const dynamic = "force-dynamic";

export default async function LegacyPropertySeoRoute({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}) {
  const { id, slug } = await params;
  // Accept either segment as the lookup key so old links with a stale slug
  // still resolve instead of 404ing.
  const property = (await fetchPublicProperty(slug)) ?? (await fetchPublicProperty(id));
  if (!property) notFound();
  permanentRedirect(await resolvePropertyPath(property));
}
