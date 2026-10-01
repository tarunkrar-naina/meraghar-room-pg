"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getPublicEnv } from "@/lib/env";
import {
  AMENITIES,
  FURNISHING_OPTIONS,
  PROPERTY_TYPE_LABELS,
  PROPERTY_TYPES,
  RENT_PERIOD_OPTIONS,
} from "@/lib/constants";
import { cn } from "@/lib/utils";
import { validateImageFile, validatePropertyForm, type FieldErrors } from "@/lib/validation";
import { createProperty, updateProperty } from "@/lib/actions/property";
import { adminCreateProperty, adminUpdateProperty } from "@/lib/actions/admin";
import { useToast } from "@/components/Toast";
import { Button, Field, Input, Select, Textarea } from "@/components/ui";
import { MapPicker } from "@/components/map/MapPicker";
import type { PropertyFormValues, PropertyStatus } from "@/types";

interface PropertyFormProps {
  userId: string;
  cities: string[];
  localities: { id: string; city: string; locality: string }[];
  propertyId?: string;
  initialValues?: Partial<PropertyFormValues>;
  initialImages?: string[];
  /**
   * Admin mode. Saves through the admin server actions (service role), shows the
   * listing-status dropdown, and redirects back to the admin table instead of
   * the owner's dashboard.
   */
  adminMode?: boolean;
  /** Initial listing status when `adminMode` is set. */
  initialStatus?: PropertyStatus;
  /** Where to go after a successful save. */
  successHref?: string;
}

const STATUS_OPTIONS: { value: PropertyStatus; label: string }[] = [
  { value: "approved", label: "Approved - site par live" },
  { value: "pending", label: "Pending - review baad me live" },
  { value: "rejected", label: "Rejected - site par nahi dikhegi" },
  { value: "rented", label: "Rented / occupied" },
  { value: "sold", label: "Sold" },
];

const emptyValues: PropertyFormValues = {
  title: "",
  description: "",
  purpose: "rent",
  property_type: "room",
  city: "",
  locality: "",
  address: "",
  pincode: "",
  price: "",
  rent_period: "monthly",
  security_deposit: "",
  bhk: "",
  bathrooms: "",
  furnishing: "unfurnished",
  area_sqft: "",
  available_from: "",
  latitude: "",
  longitude: "",
  amenities: [],
};

export function PropertyForm({
  userId,
  cities,
  localities,
  propertyId,
  initialValues,
  initialImages = [],
  adminMode = false,
  initialStatus = "approved",
  successHref,
}: PropertyFormProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState<PropertyFormValues>({
    ...emptyValues,
    ...initialValues,
    amenities: initialValues?.amenities ?? [],
  });
  const [status, setStatus] = useState<PropertyStatus>(initialStatus);
  const [images, setImages] = useState<string[]>(initialImages);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cityLocalities = useMemo(
    () => localities.filter((l) => l.city === values.city),
    [localities, values.city]
  );

  const set = (key: keyof PropertyFormValues, value: string | string[]) =>
    setValues((v) => ({ ...v, [key]: value }));

  function toggleAmenity(amenity: string) {
    setValues((v) => {
      const next = v.amenities.includes(amenity)
        ? v.amenities.filter((a) => a !== amenity)
        : [...v.amenities, amenity];
      return { ...v, amenities: next };
    });
  }

  function handleMapChange(
    lat: number | null,
    lng: number | null,
    extra?: { city?: string; locality?: string }
  ) {
    setValues((v) => {
      const next = { ...v, latitude: lat ? String(lat.toFixed(6)) : "", longitude: lng ? String(lng.toFixed(6)) : "" };
      if (extra?.city && !v.city) next.city = extra.city;
      if (extra?.locality && !v.locality) next.locality = extra.locality;
      return next;
    });
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const supabase = getSupabaseBrowserClient();
    const env = getPublicEnv();

    if (!supabase || !env.isSupabaseConfigured) {
      toast("Image upload requires Supabase storage to be configured.", "error");
      return;
    }

    const newImages = [...images];
    for (const file of Array.from(files)) {
      const validationError = validateImageFile(file);
      if (validationError) {
        toast(validationError, "error");
        continue;
      }
      if (newImages.length >= 10) {
        toast("Maximum 10 images allowed.", "warning");
        break;
      }

      setUploading(true);
      const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${file.name.split(".").pop() ?? "jpg"}`;
      const { error } = await supabase.storage
        .from(env.supabaseBucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });

      if (error) {
        toast(`Upload failed: ${error.message}`, "error");
        setUploading(false);
        continue;
      }

      const { data: urlData } = supabase.storage.from(env.supabaseBucket).getPublicUrl(path);
      newImages.push(urlData.publicUrl);
    }
    setUploading(false);
    setImages(newImages);
  }

  function removeImage(index: number) {
    setImages((imgs) => imgs.filter((_, i) => i !== index));
  }

  function validate(): boolean {
    const errs = validatePropertyForm(values as unknown as Record<string, string | string[] | undefined>);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      toast(Object.values(errs)[0], "error");
      return false;
    }
    if (images.length === 0) {
      toast("Please add at least one image of the property.", "warning");
      return false;
    }
    return true;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate() || uploading) return;

    startTransition(async () => {
      const result: { ok: boolean; error?: string; propertyId?: string } = adminMode
        ? propertyId
          ? await adminUpdateProperty(propertyId, { ...values, status }, images)
          : await adminCreateProperty({ ...values, status }, images)
        : propertyId
          ? await updateProperty(propertyId, values, images)
          : await createProperty(values, images);

      if (!result.ok) {
        toast(result.error ?? "Something went wrong.", "error");
        return;
      }

      toast(
        propertyId
          ? "Property update ho gayi - changes live hain."
          : "Property save ho gayi.",
        "success"
      );

      if (successHref) {
        router.push(successHref);
        router.refresh();
      } else if (result.propertyId) {
        router.push("/admin/properties");
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  const sectionCls = "rounded-2xl border border-slate-200 bg-white p-5 sm:p-6";
  const sectionTitleCls = "mb-4 text-base font-bold text-slate-900";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* ---------- Basic information ---------- */}
      <section className={sectionCls}>
        <h2 className={sectionTitleCls}>Basic Information</h2>
        <div className="space-y-4">
          <Field label="Property title" error={errors.title}>
            <Input
              value={values.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. 2 BHK flat for rent in New Colony"
              maxLength={80}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Purpose" error={errors.purpose}>
              <Select value={values.purpose} onChange={(e) => set("purpose", e.target.value)}>
                <option value="rent">For Rent</option>
                <option value="sale">For Sale</option>
              </Select>
            </Field>
            <Field label="Property type" error={errors.property_type}>
              <Select value={values.property_type} onChange={(e) => set("property_type", e.target.value)}>
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Description" error={errors.description}>
            <Textarea
              value={values.description}
              onChange={(e) => set("description", e.target.value)}
              rows={4}
              placeholder="Describe the property - condition, nearby landmarks, what's included..."
              maxLength={5000}
            />
          </Field>
        </div>
      </section>

      {/* ---------- Location ---------- */}
      <section className={sectionCls}>
        <h2 className={sectionTitleCls}>Location</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="City" error={errors.city}>
            <Input
              list="meraghar-cities"
              value={values.city}
              onChange={(e) => {
                set("city", e.target.value);
                set("locality", "");
              }}
              placeholder="e.g. Kaithal"
            />
            <datalist id="meraghar-cities">
              {cities.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </Field>

          <Field label="Locality / Area" error={errors.locality}>
            <Input
              list="meraghar-localities"
              value={values.locality}
              onChange={(e) => set("locality", e.target.value)}
              placeholder="e.g. New Colony"
            />
            <datalist id="meraghar-localities">
              {cityLocalities.map((l) => (
                <option key={l.id} value={l.locality} />
              ))}
            </datalist>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Full address">
              <Input
                value={values.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="House/street details (shown publicly)"
                maxLength={200}
              />
            </Field>
          </div>

          <Field label="Pincode" error={errors.pincode}>
            <Input
              value={values.pincode}
              onChange={(e) => set("pincode", e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
              placeholder="6 digit pincode"
              inputMode="numeric"
            />
          </Field>
        </div>
      </section>

      {/* ---------- Map location ---------- */}
      <section className={sectionCls}>
        <h2 className={sectionTitleCls}>Map Location</h2>
        <p className="mb-4 text-sm text-slate-500">
          Pin the exact location on the map so buyers/tenants can find your property easily.
          Click on the map to drop a marker, search an area, or use your current location.
        </p>
        <MapPicker
          latitude={values.latitude}
          longitude={values.longitude}
          onChange={handleMapChange}
        />
      </section>

      {/* ---------- Property details ---------- */}
      <section className={sectionCls}>
        <h2 className={sectionTitleCls}>Property Details</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={values.purpose === "rent" ? "Monthly rent (₹)" : "Price (₹)"} error={errors.price}>
            <Input
              type="number"
              min={0}
              value={values.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder={values.purpose === "rent" ? "6000" : "3500000"}
            />
          </Field>

          {values.purpose === "rent" && (
            <>
              <Field label="Rent period" error={errors.rent_period}>
                <Select value={values.rent_period} onChange={(e) => set("rent_period", e.target.value)}>
                  {RENT_PERIOD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Security deposit (₹)" error={errors.security_deposit}>
                <Input
                  type="number"
                  min={0}
                  value={values.security_deposit}
                  onChange={(e) => set("security_deposit", e.target.value)}
                  placeholder="e.g. 12000"
                />
              </Field>
            </>
          )}

          <Field label="BHK" error={errors.bhk}>
            <Select value={values.bhk} onChange={(e) => set("bhk", e.target.value)}>
              <option value="">Not applicable</option>
              <option value="1">1 BHK</option>
              <option value="2">2 BHK</option>
              <option value="3">3 BHK</option>
              <option value="4">4 BHK</option>
              <option value="5">5+ BHK</option>
            </Select>
          </Field>

          <Field label="Bathrooms" error={errors.bathrooms}>
            <Input
              type="number"
              min={0}
              value={values.bathrooms}
              onChange={(e) => set("bathrooms", e.target.value)}
              placeholder="e.g. 1"
            />
          </Field>

          <Field label="Furnishing" error={errors.furnishing}>
            <Select value={values.furnishing} onChange={(e) => set("furnishing", e.target.value)}>
              {FURNISHING_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </Field>

          <Field label="Area (sq ft)" error={errors.area_sqft}>
            <Input
              type="number"
              min={0}
              value={values.area_sqft}
              onChange={(e) => set("area_sqft", e.target.value)}
              placeholder="e.g. 800"
            />
          </Field>

          <Field label="Available from">
            <Input
              type="date"
              value={values.available_from}
              onChange={(e) => set("available_from", e.target.value)}
            />
          </Field>
        </div>
      </section>

      {/* ---------- Amenities ---------- */}
      <section className={sectionCls}>
        <h2 className={sectionTitleCls}>Amenities</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
          {AMENITIES.map((amenity) => {
            const active = values.amenities.includes(amenity);
            return (
              <button
                key={amenity}
                type="button"
                onClick={() => toggleAmenity(amenity)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-300"
                )}
              >
                <span
                  className={cn(
                    "flex h-4 w-4 items-center justify-center rounded border",
                    active ? "border-teal-600 bg-teal-600" : "border-slate-300"
                  )}
                >
                  {active && <span className="h-2 w-2 rounded-full bg-white" />}
                </span>
                {amenity}
              </button>
            );
          })}
        </div>
      </section>

      {/* ---------- Images ---------- */}
      <section className={sectionCls}>
        <h2 className={sectionTitleCls}>Images</h2>
        <p className="mb-4 text-sm text-slate-500">
          Upload up to 10 images (JPG, PNG, WEBP). Each image max 5 MB.
        </p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((url, i) => (
            <div key={url} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-slate-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Upload ${i + 1}`} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute right-1.5 top-1.5 rounded-full bg-slate-900/70 px-2 py-0.5 text-xs font-semibold text-white hover:bg-red-600"
              >
                Remove
              </button>
            </div>
          ))}

          {images.length < 10 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex aspect-[4/3] flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 text-slate-500 transition-colors hover:border-teal-400 hover:text-teal-600"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <UploadCloud className="h-6 w-6" />
                  Add image
                </>
              )}
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </section>

      {/* ---------- Admin: listing status ---------- */}
      {adminMode && (
        <section className={sectionCls}>
          <h2 className={sectionTitleCls}>Listing status</h2>
          <p className="mb-4 text-sm text-slate-500">
            Sirf <span className="font-semibold text-emerald-700">Approved</span> wali
            property public site par dikhti hai. Baaki statuses review ya archive ke liye hain.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {STATUS_OPTIONS.map((option) => (
              <label
                key={option.value}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition-colors ${
                  status === option.value
                    ? "border-teal-500 bg-teal-50 text-teal-900"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <input
                  type="radio"
                  name="status"
                  value={option.value}
                  checked={status === option.value}
                  onChange={() => setStatus(option.value)}
                  className="h-4 w-4 accent-teal-600"
                />
                {option.label}
              </label>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <p className="text-xs text-slate-400">
          {adminMode
            ? "Save karte hi property turant live ho jati hai (approved status par)."
            : "Save karte hi aapki property home page par cards ki form me dikhne lagegi."}
        </p>
        <Button type="submit" size="lg" loading={pending} className="sm:w-auto">
          {propertyId ? "Save changes" : "Save Property"}
        </Button>
      </div>
    </form>
  );
}