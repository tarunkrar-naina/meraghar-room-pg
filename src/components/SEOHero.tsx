  import { Search } from "lucide-react";
import type { City } from "@/types/seo";
import { SEO_CITIES } from "@/lib/seo-config";

export function SEOHero({
  cities = SEO_CITIES,
  title = "MeraGhar - Find Your Perfect Property in Kaithal, Kurukshetra & More",
  description = "Apna Sapna Ghar / तुम्हारा सपना घर. Find rooms, PG, flats, houses and shops for rent or sale across Haryana.",
  children,
}: {
  cities?: Array<Pick<City, "name" | "slug">>;
  title?: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden bg-slate-900 bg-[radial-gradient(80rem_30rem_at_80%_-10%,rgba(13,148,136,0.45),transparent),linear-gradient(135deg,#134e4a_0%,#0f172a_60%,#1e293b_100%)]">
      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-300 ring-1 ring-white/20">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            Local property marketplace · Haryana
          </span>
          <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">{title}</h1>
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-lg">{description}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2 text-sm text-slate-300">
            {cities.map((city) => (
              <a key={city.slug} href={`/${city.slug}/`} className="rounded-full bg-white/10 px-3 py-1.5 hover:bg-white/20">
                {city.name}
              </a>
            ))}
          </div>
          {children && <div className="mt-8">{children}</div>}
        </div>
      </div>
    </section>
  );
}
