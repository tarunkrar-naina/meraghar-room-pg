import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { RequirementsBoard } from "@/components/requirements/RequirementsBoard";
import { fetchRequirements } from "@/lib/queries";
import { buildCanonicalUrl } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Requirements",
  description: "Browse property requirements in Kaithal, Kurukshetra, Pundri and Narwana, or post your own requirement.",
  alternates: { canonical: buildCanonicalUrl("/requirements/") },
};

export default async function RequirementsPage() {
  const requirements = await fetchRequirements();

  return (
    <Container className="py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">Property requirements</h1>
          <p className="mt-1 text-sm text-slate-500">
            People looking for properties in Kaithal, Kurukshetra, Pundri &amp; Narwana. Post yours and let owners reach you — aapki contact
            details private rehti hain.
          </p>
        </div>
        <Link
          href="/post-requirement"
          className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Post your requirement
        </Link>
      </div>
      <RequirementsBoard requirements={requirements} />
    </Container>
  );
}