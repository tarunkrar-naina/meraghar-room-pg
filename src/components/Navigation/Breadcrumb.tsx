import Link from "next/link";
import { Home as HomeIcon } from "lucide-react";
import { JsonLd } from "@/components/JsonLd";
import { buildCanonicalUrl, generateSchemaMarkup } from "@/lib/seo";
import type { BreadcrumbItem } from "@/types/seo";

export interface BreadcrumbProps {
  items: BreadcrumbItem[];
  includeSchema?: boolean;
  className?: string;
}

export function Breadcrumb({ items, includeSchema = true, className = "" }: BreadcrumbProps) {
  const allItems: BreadcrumbItem[] = [
    { name: "Home", href: "/" },
    ...items.filter((item) => item.name.toLowerCase() !== "home"),
  ];
  const schemaItems = allItems.map((item) => ({
    name: item.name,
    href: item.href,
    url: item.url ?? (item.href ? buildCanonicalUrl(item.href) : undefined),
  }));

  return (
    <>
      <nav aria-label="Breadcrumb" className={`mb-4 ${className}`.trim()}>
        <ol className="flex flex-wrap items-center gap-1 text-sm text-slate-500">
          {allItems.map((item, index) => {
            const last = index === allItems.length - 1;
            return (
              <li key={`${item.name}-${index}`} className="inline-flex items-center gap-1">
                {index > 0 && <span aria-hidden="true" className="text-slate-300">/</span>}
                {last ? (
                  <span aria-current="page" className="font-medium text-slate-700">
                    {item.name}
                  </span>
                ) : (
                  <Link href={item.href ?? "/"} className="inline-flex items-center gap-1 hover:text-teal-700">
                    {index === 0 && <HomeIcon className="h-3.5 w-3.5" aria-hidden="true" />}
                    {item.name}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      {includeSchema && <JsonLd data={generateSchemaMarkup("Breadcrumb", { items: schemaItems })} />}
    </>
  );
}
