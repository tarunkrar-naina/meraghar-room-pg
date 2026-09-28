import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Container } from "@/components/ui";
import { RequirementForm } from "@/components/requirements/RequirementForm";
import { getAuthUser } from "@/lib/auth";
import { fetchCities, fetchLocalities } from "@/lib/queries";

export const metadata: Metadata = {
  title: "Post Requirement",
  description: "Tell owners exactly what you are looking for in Kaithal, Kurukshetra, Pundri and Narwana.",
};

export default async function PostRequirementPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const user = await getAuthUser();
  if (!user) redirect("/login?next=/post-requirement");

  const { type } = await searchParams;
  const isShop = type === "shop";
  const [cities, localities] = await Promise.all([fetchCities(), fetchLocalities()]);

  return (
    <Container className="max-w-2xl py-8">
      <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
        {isShop ? "I need a shop" : "Post your requirement"}
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {isShop
          ? "Apne business ke liye shop batao - MeraGhar aapko sahi jagah dhoondh ke connect karega."
          : "Describe what you are looking for. MeraGhar admin (aapke liye) matching owners ko connect karega - details sirf MeraGhar ke paas protected hain."}
      </p>
      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
        <RequirementForm
          cities={cities}
          localities={localities}
          initialType={isShop ? "shop" : ""}
          initialPurpose={isShop ? "rent" : "rent"}
        />
      </div>
    </Container>
  );
}