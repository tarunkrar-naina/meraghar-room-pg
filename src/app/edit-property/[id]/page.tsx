import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui";
import { PropertyForm } from "@/components/PropertyForm";
import { fetchCities, fetchLocalities, fetchPropertyForOwner } from "@/lib/queries";
import { requireAdmin } from "@/lib/auth";
import type { AppPageProps } from "@/types";

export const metadata: Metadata = {
  title: "Edit Property",
  description: "Edit your property listing on MeraGhar.",
};

export default async function EditPropertyPage(
  props: AppPageProps<{ id: string }>
) {
  const { id } = await props.params;
  const user = await requireAdmin();
  const [cities, localities, property] = await Promise.all([
    fetchCities(),
    fetchLocalities(),
    fetchPropertyForOwner(id, user.id),
  ]);

  if (!property) notFound();

  const images = (property.images ?? []).map((i) => i.image_url);

  return (
    <Container className="max-w-3xl py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Edit property</h1>
      <p className="mt-1 text-sm text-slate-500">
        Your changes will be published immediately.
      </p>
      <div className="mt-6">
        <PropertyForm
          userId={user.id}
          cities={cities}
          localities={localities}
          propertyId={property.id}
          initialValues={{
            title: property.title,
            description: property.description ?? "",
            purpose: property.purpose,
            property_type: property.property_type,
            city: property.city,
            locality: property.locality ?? "",
            address: property.address ?? "",
            pincode: property.pincode ?? "",
            price: String(property.price),
            rent_period: property.rent_period,
            security_deposit:
              typeof property.security_deposit === "number" ? String(property.security_deposit) : "",
            bhk: typeof property.bhk === "number" ? String(property.bhk) : "",
            bathrooms: typeof property.bathrooms === "number" ? String(property.bathrooms) : "",
            furnishing: property.furnishing,
            area_sqft: typeof property.area_sqft === "number" ? String(property.area_sqft) : "",
            available_from: property.available_from?.slice(0, 10) ?? "",
            latitude: typeof property.latitude === "number" ? String(property.latitude) : "",
            longitude: typeof property.longitude === "number" ? String(property.longitude) : "",
            amenities: property.amenities ?? [],
          }}
          initialImages={images}
        />
      </div>
    </Container>
  );
}