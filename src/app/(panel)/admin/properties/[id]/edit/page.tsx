import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { assertAdmin } from "@/lib/admin-access";
import { fetchAdminProperty } from "@/lib/admin-queries";
import { fetchCities, fetchLocalities } from "@/lib/queries";
import { PropertyForm } from "@/components/PropertyForm";
import type { AppPageProps } from "@/types";
import type { PropertyFormValues, PropertyStatus } from "@/types";

export const metadata: Metadata = { title: "Property Edit Karein" };

export const dynamic = "force-dynamic";

export default async function AdminEditPropertyPage(props: AppPageProps<{ id: string }>) {
  const guard = await assertAdmin();
  if (!guard.ok) notFound();

  const { id } = await props.params;
  const property = await fetchAdminProperty(id);
  if (!property) notFound();

  const [cities, localities] = await Promise.all([fetchCities(), fetchLocalities()]);

  const initialValues: Partial<PropertyFormValues> = {
    title: property.title,
    description: property.description ?? "",
    purpose: property.purpose as PropertyFormValues["purpose"],
    property_type: property.property_type as PropertyFormValues["property_type"],
    city: property.city,
    locality: property.locality ?? "",
    address: property.address ?? "",
    pincode: property.pincode ?? "",
    price: property.price ? String(property.price) : "",
    rent_period: (property.rent_period ?? "monthly") as PropertyFormValues["rent_period"],
    security_deposit: property.security_deposit ? String(property.security_deposit) : "",
    bhk: property.bhk ? String(property.bhk) : "",
    bathrooms: property.bathrooms ? String(property.bathrooms) : "",
    furnishing: property.furnishing as PropertyFormValues["furnishing"],
    area_sqft: property.area_sqft ? String(property.area_sqft) : "",
    available_from: property.available_from ?? "",
    latitude: property.latitude ? String(property.latitude) : "",
    longitude: property.longitude ? String(property.longitude) : "",
    amenities: property.amenities ?? [],
  };

  const images = [...property.property_images]
    .sort((a, b) => a.display_order - b.display_order)
    .map((img) => img.image_url);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/properties"
        className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-teal-700"
      >
        <ArrowLeft className="h-4 w-4" /> Properties par wapas
      </Link>
      <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900">
        Property edit karein
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {property.title} · {property.city}
      </p>

      <div className="mt-6">
        <PropertyForm
          userId={guard.user.id}
          cities={cities}
          localities={localities}
          propertyId={property.id}
          initialValues={initialValues}
          initialImages={images}
          initialStatus={property.status as PropertyStatus}
          adminMode
          successHref="/admin/properties"
        />
      </div>
    </div>
  );
}