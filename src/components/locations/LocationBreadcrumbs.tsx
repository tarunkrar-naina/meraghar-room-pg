import { Breadcrumb } from "@/components/Navigation/Breadcrumb";

export interface Crumb {
  label: string;
  href?: string;
}

export function LocationBreadcrumbs({ items }: { items: Crumb[] }) {
  return <Breadcrumb items={items.map((item) => ({ name: item.label, href: item.href }))} />;
}
