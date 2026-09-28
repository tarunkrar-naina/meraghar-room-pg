import Link from "next/link";
import {
  BadgeCheck,
  BedDouble,
  Bath,
  CalendarDays,
  Eye,
  Home,
  MapPin,
  Ruler,
  ShieldCheck,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  IndianRupee,
} from "lucide-react";
import { cn, formatDate, formatINR, formatPriceForCard, propertyTypeLabel, timeAgo, titleCase } from "@/lib/utils";
import {
  FURNISHING_LABELS,
  PROPERTY_STATUS_LABELS,
} from "@/lib/constants";
import { ImageGallery } from "@/components/ImageGallery";
import { ReportModal } from "@/components/ReportModal";
import { SaveButton } from "@/components/SaveButton";
import { AdminContactCard } from "@/components/AdminContactCard";
import { buildPropertyImageAlt } from "@/lib/seo";
import type { PropertyWithImages, PublicOwnerRow } from "@/types";

function Badge({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-semibold", className)}>
      {children}
    </span>
  );
}

export function PropertyDetails({
  property,
  owner,
  isLoggedIn = false,
  saved = false,
  userIsOwner = false,
}: {
  property: PropertyWithImages;
  owner: PublicOwnerRow | null;
  isLoggedIn?: boolean;
  saved?: boolean;
  userIsOwner?: boolean;
}) {
  const images = property.images?.length
    ? property.images.map((i) => i.image_url)
    : [];
  const amenityList = property.amenities ?? [];
  const galleryAlt = buildPropertyImageAlt({
    property_type: property.property_type,
    bhk: property.bhk,
    city: property.city,
    locality: property.locality,
  });

  return (
    <>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px]">
        {/* ---------- Left column ---------- */}
        <div className="min-w-0 space-y-6">
          <ImageGallery images={images} title={property.title} altText={galleryAlt} />

          {/* overview chips */}
          <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-4">
            <OverviewItem icon={<Home className="h-5 w-5" />} label="Type" value={propertyTypeLabel(property.property_type)} />
            {typeof property.bhk === "number" && property.bhk > 0 && (
              <OverviewItem icon={<BedDouble className="h-5 w-5" />} label="Bedrooms" value={`${property.bhk} BHK`} />
            )}
            {typeof property.bathrooms === "number" && property.bathrooms > 0 && (
              <OverviewItem icon={<Bath className="h-5 w-5" />} label="Bathrooms" value={String(property.bathrooms)} />
            )}
            {typeof property.area_sqft === "number" && (
              <OverviewItem icon={<Ruler className="h-5 w-5" />} label="Area" value={`${property.area_sqft} sq ft`} />
            )}
            {typeof property.area_sqft !== "number" && (
              <OverviewItem icon={<Home className="h-5 w-5" />} label="Furnishing" value={FURNISHING_LABELS[property.furnishing]} />
            )}
          </div>

          {/* description */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Description</h2>
            <p className="whitespace-pre-line leading-relaxed text-slate-600">
              {property.description || "No description provided."}
            </p>
          </section>

          {/* amenities */}
          {amenityList.length > 0 && (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
              <h2 className="mb-4 text-lg font-bold text-slate-900">Amenities</h2>
              <div className="flex flex-wrap gap-2">
                {amenityList.map((a) => (
                  <span key={a} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-slate-700">
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                    {titleCase(a)}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* location */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="mb-3 text-lg font-bold text-slate-900">Location</h2>
            <p className="flex items-start gap-2 text-slate-600">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-teal-600" />
              <span>
                {[property.locality, property.city, property.pincode].filter(Boolean).join(", ")}
                {property.address ? ` — ${property.address}` : ""}
              </span>
            </p>

            {typeof property.latitude === "number" && typeof property.longitude === "number" && (
              <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
                <iframe
                  title={`Map for ${property.title}`}
                  src={`https://maps.google.com/maps?q=${property.latitude},${property.longitude}&z=15&output=embed`}
                  className="h-56 w-full"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </section>

          {/* safety note */}
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              <strong>Safety first:</strong> Never send money before personally verifying the
              property and owner. MeraGhar never asks for payments through this platform.
            </p>
          </div>
        </div>

        {/* ---------- Right column ---------- */}
        <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          {/* price card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            {property.is_featured && (
              <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Sparkles className="h-3.5 w-3.5" /> Featured listing
              </span>
            )}
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">
                  {formatPriceForCard(property.price, property.purpose, property.rent_period)}
                </p>
                {property.purpose === "rent" && typeof property.security_deposit === "number" && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <IndianRupee className="h-3.5 w-3.5" />
                    Security deposit: {formatINR(property.security_deposit)}
                  </p>
                )}
              </div>
              <Badge
                className={cn(
                  property.purpose === "rent"
                    ? "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                    : "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
                )}
              >
                {property.purpose === "rent" ? "For Rent" : "For Sale"}
              </Badge>
            </div>

            <h1 className="mt-3 text-xl font-bold leading-snug text-slate-900">{property.title}</h1>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin className="h-4 w-4 text-slate-400" />
              {[property.locality, property.city].filter(Boolean).join(", ")}
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {property.is_verified ? (
                <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                  <BadgeCheck className="h-3.5 w-3.5" /> Verified property
                </Badge>
              ) : (
                <Badge className="bg-slate-50 text-slate-500 ring-1 ring-slate-200">
                  <ShieldCheck className="h-3.5 w-3.5" /> Not yet verified
                </Badge>
              )}
              <Badge className="bg-slate-50 text-slate-600 ring-1 ring-slate-200">
                {PROPERTY_STATUS_LABELS[property.status]}
              </Badge>
            </div>

            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <CalendarDays className="h-3.5 w-3.5" />
              Posted {timeAgo(property.created_at)} · {formatDate(property.created_at)}
              <span className="ml-auto flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> {property.views} views
              </span>
            </div>

            {property.available_from && (
              <p className="mt-3 rounded-lg bg-teal-50 px-3 py-2 text-xs font-medium text-teal-800">
                Available from {formatDate(property.available_from)}
              </p>
            )}

            {property.purpose === "rent" && (
              <p className="mt-2 text-xs text-slate-500">
                Rent period: {titleCase((property.rent_period ?? "monthly").replace("_", " "))}
              </p>
            )}
          </div>

          {/* owner card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              {property.is_verified ? "Verified Owner" : "Owner"}
            </h3>
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-600 text-lg font-bold text-white">
                {(owner?.name ?? "?").charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{owner?.name ?? "Property Owner"}</p>
                <p className="flex items-center gap-1 text-xs text-slate-400">
                  <ShieldCheck className="h-3.5 w-3.5" /> Contact details protected - MeraGhar Admin ke pas
                </p>
              </div>
              {property.is_verified && <BadgeCheck className="ml-auto h-6 w-6 shrink-0 text-teal-600" />}
            </div>

            <div className="mt-4">
              <AdminContactCard propertyId={property.id} subject={property.title} />
            </div>
          </div>

            <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
              <SaveButton propertyId={property.id} initialSaved={saved} isLoggedIn={isLoggedIn} />
              <ReportModal propertyId={property.id} />
            </div>

            {userIsOwner && (
              <div className="mt-4 rounded-lg bg-teal-50 p-3 text-center text-sm font-medium text-teal-800">
                This is your listing.{" "}
                <Link href={`/edit-property/${property.id}`} className="underline">Edit it</Link>
              </div>
            )}
          </div>
        </div>
    </>
  );
}

function OverviewItem({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-800">{value}</p>
      </div>
    </div>
  );
}