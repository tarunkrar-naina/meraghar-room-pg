import { PropertyGrid } from "@/components/PropertyGrid";
import type { PropertyCardData } from "@/types";

export function RelatedProperties({
  properties,
  city,
  savedIds = [],
  isLoggedIn = false,
}: {
  properties: PropertyCardData[];
  city: string;
  savedIds?: string[];
  isLoggedIn?: boolean;
}) {
  if (properties.length === 0) return null;

  return (
    <section className="mt-14" aria-labelledby="related-properties-heading">
      <h2 id="related-properties-heading" className="mb-5 text-xl font-bold text-slate-900 sm:text-2xl">
        Similar properties in {city}
      </h2>
      <PropertyGrid properties={properties} savedIds={savedIds} isLoggedIn={isLoggedIn} />
    </section>
  );
}
