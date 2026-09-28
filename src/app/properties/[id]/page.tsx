import { notFound, permanentRedirect } from "next/navigation";
import { resolvePropertyPath } from "@/lib/locations";
import { fetchPublicProperty } from "@/lib/queries";

/**
 * Legacy uuid property URL: /properties/{id} -> 308 to the canonical keyword
 * path /{city}/{category}/{slug}/
 */
export const dynamic = "force-dynamic";

export default async function LegacyPropertyByIdPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const property = await fetchPublicProperty(id);
  if (!property) notFound();
  permanentRedirect(await resolvePropertyPath(property));
}
