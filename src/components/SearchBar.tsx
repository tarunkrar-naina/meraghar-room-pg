"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search } from "lucide-react";
import { PROPERTY_TYPE_LABELS, PROPERTY_TYPES } from "@/lib/constants";
import { trackEvent } from "@/lib/analytics";
import { cn } from "@/lib/utils";

export function SearchBar({
  cities,
  initialCity = "",
  initialPurpose = "",
  compact = false,
}: {
  cities: string[];
  initialCity?: string;
  initialPurpose?: string;
  compact?: boolean;
}) {
  const router = useRouter();
  const [city, setCity] = useState(initialCity);
  const [purpose, setPurpose] = useState(initialPurpose);
  const [type, setType] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (purpose) params.set("purpose", purpose);
    if (type) params.set("type", type);
    if (minPrice) params.set("minPrice", minPrice);
    if (maxPrice) params.set("maxPrice", maxPrice);
    router.push(`/properties${params.toString() ? `?${params.toString()}` : ""}`);
    trackEvent("search", { city, purpose, type });
  }

  const selectClass = "h-11 w-full rounded-lg border border-white/30 bg-white/95 px-3 text-sm text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <form
      onSubmit={handleSubmit}
      className={cn(
        "rounded-2xl bg-white/95 p-3 shadow-xl ring-1 ring-slate-200/60 backdrop-blur",
        compact ? "max-w-3xl" : "mx-auto w-full max-w-4xl"
      )}
    >
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className={selectClass}
          aria-label="City"
        >
          <option value="">All cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <select
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          className={selectClass}
          aria-label="Purpose"
        >
          <option value="">Rent / Sale</option>
          <option value="rent">For Rent</option>
          <option value="sale">For Sale</option>
        </select>

        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={selectClass}
          aria-label="Property type"
        >
          <option value="">All types</option>
          {PROPERTY_TYPES.map((t) => (
            <option key={t} value={t}>{PROPERTY_TYPE_LABELS[t]}</option>
          ))}
        </select>

        <select
          value={minPrice}
          onChange={(e) => setMinPrice(e.target.value)}
          className={selectClass}
          aria-label="Minimum price"
        >
          <option value="">Min Price</option>
          <option value="3000">₹3,000</option>
          <option value="5000">₹5,000</option>
          <option value="8000">₹8,000</option>
          <option value="12000">₹12,000</option>
          <option value="15000">₹15,000</option>
          <option value="20000">₹20,000</option>
          <option value="50000">₹50,000</option>
        </select>

        <select
          value={maxPrice}
          onChange={(e) => setMaxPrice(e.target.value)}
          className={selectClass}
          aria-label="Maximum price"
        >
          <option value="">Max Price</option>
          <option value="5000">₹5,000</option>
          <option value="8000">₹8,000</option>
          <option value="10000">₹10,000</option>
          <option value="15000">₹15,000</option>
          <option value="25000">₹25,000</option>
          <option value="50000">₹50,000</option>
          <option value="3000000">₹30 lakh</option>
          <option value="5000000">₹50 lakh</option>
          <option value="10000000">₹1 crore</option>
        </select>
      </div>

      <button
        type="submit"
        className="mt-2 inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-6 text-base font-semibold text-white transition-colors hover:bg-teal-700"
      >
        <Search className="h-5 w-5" />
        Search Properties
      </button>
    </form>
  );
}