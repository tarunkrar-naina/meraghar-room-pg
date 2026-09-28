import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SEO_CATEGORIES } from "@/lib/seo-config";
import type { Category } from "@/types/seo";

export function CategoryNav({
  citySlug,
  categories = SEO_CATEGORIES,
  activeSlug,
  heading,
}: {
  citySlug: string;
  categories?: Category[];
  activeSlug?: string;
  heading?: string;
}) {
  return (
    <nav aria-label="Property categories" className={heading ? "mt-8" : ""}>
      {heading && <h2 className="mb-4 text-xl font-bold text-slate-900 sm:text-2xl">{heading}</h2>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category.slug}
            href={`/${citySlug}/${category.slug}/`}
            aria-current={activeSlug === category.slug ? "page" : undefined}
            className="group rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-300 hover:shadow-sm"
          >
            <span className="block text-sm font-semibold text-slate-900 group-hover:text-teal-700">{category.name}</span>
            <span className="mt-2 inline-flex items-center gap-1 text-xs text-teal-700">
              Browse <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
