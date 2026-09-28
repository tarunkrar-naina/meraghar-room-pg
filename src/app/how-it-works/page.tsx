import type { Metadata } from "next";
import { CheckCircle2, ClipboardList, MessageCircle, Search } from "lucide-react";
import { Container } from "@/components/ui";
import { generateMetadata as buildSeoMetadata } from "@/lib/seo";

export const metadata: Metadata = buildSeoMetadata("static", {
  title: "How MeraGhar Works | Find or List Property",
  description: "See how to search rooms, PG, flats, houses and shops on MeraGhar and how property owners can list their property.",
  path: "/how-it-works/",
  keywords: ["how MeraGhar works", "list property", "find room Haryana"],
});

const steps = [
  { icon: Search, title: "Search your city", text: "Choose a city, category, area and budget to see relevant local listings." },
  { icon: ClipboardList, title: "Review the details", text: "Check photos, price, location, amenities and the owner's property information." },
  { icon: MessageCircle, title: "Connect safely", text: "Use the MeraGhar contact flow and communicate directly with the property team." },
  { icon: CheckCircle2, title: "Visit and verify", text: "Visit the property, verify the owner and agree on terms before any payment." },
];

export default function HowItWorksPage() {
  return (
    <Container className="py-10 sm:py-16">
      <div className="mx-auto max-w-3xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">How it works</p>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-5xl">From search to safe visit</h1>
        <p className="mt-5 text-lg leading-8 text-slate-600">MeraGhar keeps the property search simple while helping owners and local buyers start the right conversation.</p>
      </div>
      <div className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-2 lg:grid-cols-4">
        {steps.map(({ icon: Icon, title, text }, index) => (
          <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><Icon className="h-6 w-6" aria-hidden="true" /></span>
            <p className="mt-5 text-xs font-bold uppercase tracking-wider text-teal-700">Step {index + 1}</p>
            <h2 className="mt-2 text-lg font-bold text-slate-900">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
          </div>
        ))}
      </div>
    </Container>
  );
}
