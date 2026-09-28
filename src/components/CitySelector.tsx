import Link from "next/link";
import { ArrowRight, MapPin } from "lucide-react";
import type { City } from "@/types/seo";
import { SEO_CITIES } from "@/lib/seo-config";

export function CitySelector({
  cities = SEO_CITIES,
  heading = "Browse properties by city",
  className = "",
}: {
  cities?: Array<Pick<City, "name" | "slug">>;
  heading?: string;
  className?: string;
}) {
  return (
    <section className={className} aria-labelledby="city-selector-heading">
      <h2 id="city-selector-heading" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
        {heading}
      </h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cities.map((city) => (
          <Link
            key={city.slug}
            href={`/${city.slug}/`}
            className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md"
          >
            <span className="flex items-center gap-2 font-semibold text-slate-900 group-hover:text-teal-700">
              <MapPin className="h-4 w-4 text-teal-600" aria-hidden="true" />
              {city.name}
            </span>
            <span className="mt-2 flex items-center gap-1 text-sm text-teal-700">
              Explore properties <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
