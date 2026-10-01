import type { Metadata } from "next";
import { BadgeCheck, HeartHandshake, MapPin, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui";
import { JsonLd } from "@/components/JsonLd";
import { generateMetadata as buildSeoMetadata, generateSchemaMarkup } from "@/lib/seo";
import { getSetting } from "@/lib/site-settings";

export const metadata: Metadata = buildSeoMetadata("static", {
  title: "About MeraGhar | Local Property Marketplace Haryana",
  description: "Learn how MeraGhar helps people find and list rooms, PG, flats, houses and shops in Kaithal, Kurukshetra, Pundri and Narwana.",
  path: "/about/",
  keywords: ["about MeraGhar", "Haryana property marketplace", "local property platform"],
});

export default async function AboutPage() {
  const [intro, body] = await Promise.all([
    getSetting(
      "about_intro",
      "MeraGhar makes it simpler to find a room, PG, flat, house or shop in your own city. Local owners can share property details, while tenants and buyers can search with clear photos, prices and location information."
    ),
    getSetting(
      "about_body",
      "We currently focus on Kaithal, Kurukshetra, Pundri and Narwana in Haryana, with more cities planned. Our goal is simple: make local property discovery transparent, useful and safe."
    ),
  ]);

  return (
    <>
      <Container className="py-10 sm:py-16">
        <div className="mx-auto max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">About MeraGhar</p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">Apna Sapna Ghar, Local Property Marketplace</h1>
          <p className="mt-5 whitespace-pre-line text-lg leading-8 text-slate-600">{intro}</p>
          <p className="mt-4 whitespace-pre-line leading-7 text-slate-600">{body}</p>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { icon: MapPin, title: "Local by design", text: "City and category pages help you start with the places and property types that matter." },
            { icon: ShieldCheck, title: "Safety first", text: "Always visit a property, verify the owner and never send money before checking the details." },
            { icon: HeartHandshake, title: "Free for owners", text: "Owners can post requirements and share property information without paid listing fees." },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
              <Icon className="h-7 w-7 text-teal-600" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-bold text-slate-900">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-14 max-w-3xl rounded-3xl bg-slate-900 p-8 text-white sm:p-10">
          <BadgeCheck className="h-8 w-8 text-teal-300" aria-hidden="true" />
          <h2 className="mt-4 text-2xl font-bold">Our promise</h2>
          <p className="mt-3 leading-7 text-slate-300">MeraGhar is a discovery and contact platform. We do not guarantee a property or accept payments on behalf of owners. Use every listing as a starting point and verify all details personally.</p>
        </div>
      </Container>
      <JsonLd data={generateSchemaMarkup("Organization", { name: "MeraGhar", description: metadata.description })} />
    </>
  );
}
