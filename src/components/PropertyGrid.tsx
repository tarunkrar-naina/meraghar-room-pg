import { PropertyCard } from "@/components/PropertyCard";
import type { PropertyCardData } from "@/types";

export function PropertyGrid({
  properties,
  savedIds = [],
  isLoggedIn = false,
  emptyState,
}: {
  properties: PropertyCardData[];
  savedIds?: string[];
  isLoggedIn?: boolean;
  emptyState?: React.ReactNode;
}) {
  if (properties.length === 0) return emptyState ?? null;

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-label="Property listings">
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          saved={savedIds.includes(property.id)}
          isLoggedIn={isLoggedIn}
        />
      ))}
    </div>
  );
}
