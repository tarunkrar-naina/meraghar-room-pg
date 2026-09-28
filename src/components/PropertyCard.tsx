import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BadgeCheck, BedDouble, Flame, MapPin } from "lucide-react";
import { cn, formatPriceForCard, propertyTypeLabel, timeAgo } from "@/lib/utils";
import { FURNISHING_LABELS } from "@/lib/constants";
import { buildPropertyImageAlt } from "@/lib/seo";
import { propertyPath } from "@/lib/urls";
import { SaveButton } from "@/components/SaveButton";
import type { PropertyCardData } from "@/types";

/** Keyword-rich canonical detail URL: /{city}/{category}/{slug}/ */
const propertyLink = (p: PropertyCardData) => propertyPath(p);

export function PropertyCard({
  property,
  saved = false,
  isLoggedIn = false,
  showStatus = false,
  layout = "grid",
}: {
  property: PropertyCardData;
  saved?: boolean;
  isLoggedIn?: boolean;
  showStatus?: boolean;
  layout?: "grid" | "list";
}) {
  const typeLabel = propertyTypeLabel(property.property_type);
  const isList = layout === "list";

  return (
    <Link
      href={propertyLink(property)}
      className={cn(
        "group flex overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg",
        isList ? "flex-col sm:flex-row" : "flex-col"
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-slate-100",
          isList ? "aspect-[16/9] w-full shrink-0 sm:aspect-auto sm:w-72" : "aspect-[4/3] w-full"
        )}
      >
        {property.image_url ? (
          <Image
            src={property.image_url}
            alt={buildPropertyImageAlt({
              property_type: property.property_type,
              bhk: property.bhk,
              city: property.city,
              locality: property.locality,
            })}
            fill
            sizes={isList ? "(min-width: 640px) 18rem, 100vw" : "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"}
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-teal-100 to-slate-200 text-slate-400">
            No image
          </div>
        )}

        {/* top-left badges */}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-xs font-semibold text-white",
              property.purpose === "rent" ? "bg-teal-600" : "bg-blue-700"
            )}
          >
            {property.purpose === "rent" ? "For Rent" : "For Sale"}
          </span>
          {property.is_featured && (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
              <Flame className="h-3 w-3" /> Featured
            </span>
          )}
          {showStatus && property.status !== "approved" && (
            <span className="rounded-md bg-slate-800/90 px-2 py-0.5 text-xs font-semibold capitalize text-white">
              {property.status}
            </span>
          )}
        </div>

        {/* top-right save */}
        <div className="absolute right-3 top-3">
          <SaveButton propertyId={property.id} initialSaved={saved} isLoggedIn={isLoggedIn} />
        </div>
      </div>

      <div className={cn("flex flex-1 flex-col p-4", isList && "sm:py-5")}>
        <div className={cn(isList && "sm:flex sm:flex-wrap sm:items-start sm:justify-between sm:gap-3")}>
          <div>
            <p className={cn("font-bold text-slate-900", isList ? "text-xl" : "text-lg")}>
              {formatPriceForCard(property.price, property.purpose, property.rent_period)}
            </p>

            <h3 className={cn("mt-1 font-medium text-slate-800 group-hover:text-teal-700", isList ? "mt-0.5" : "line-clamp-2")}>
              {property.title}
            </h3>

            <p className="mt-1.5 flex items-center gap-1 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {property.locality ? `${property.locality}, ` : ""}
                {property.city}
              </span>
            </p>
          </div>
          {isList && (
            <div className="mt-2 text-right sm:text-right">
              <span className={cn("inline-flex items-center gap-1 text-sm font-semibold", property.is_verified ? "text-teal-600" : "text-slate-400")}>
                {property.is_verified ? <BadgeCheck className="h-4 w-4" /> : null}
                {property.is_verified ? "Verified" : "Unverified"}
              </span>
              <span className="mt-3 block w-full sm:w-auto">
                <span className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-4 text-xs font-semibold text-white transition-colors group-hover:bg-teal-700 sm:w-auto">
                  View Details <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">{typeLabel}</span>
          {typeof property.bhk === "number" && property.bhk > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-slate-100 px-2 py-0.5 font-medium">
              <BedDouble className="h-3 w-3" />
              {property.bhk} BHK
            </span>
          )}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium">
            {FURNISHING_LABELS[property.furnishing]}
          </span>
        </div>

        {!isList && (
          <div className="mt-auto pt-4">
            <div className="flex items-center justify-between">
              {property.is_verified ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-600">
                  <BadgeCheck className="h-4 w-4" /> Verified
                </span>
              ) : (
                <span className="text-xs text-slate-400">Unverified</span>
              )}
              <span className="text-xs text-slate-400">{timeAgo(property.created_at)}</span>
            </div>
            <span className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-teal-600 text-sm font-semibold text-white transition-colors group-hover:bg-teal-700">
              View Full Details <ArrowRight className="h-4 w-4" />
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}