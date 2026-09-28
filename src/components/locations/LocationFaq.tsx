import { APP_NAME } from "@/lib/constants";
import type { LocationRow } from "@/types";
import type { LocationCategory } from "@/lib/locations/catalog";
import { JsonLd } from "@/components/JsonLd";
import { faqPageJsonLd } from "@/lib/locations/structured-data";

interface Faq {
  question: string;
  answer: string;
}

export function LocationFaq({
  location,
  category,
  areas,
}: {
  location: LocationRow;
  category?: LocationCategory;
  areas: string[];
}) {
  const topic = category ? category.label.toLowerCase() : "rentals";
  const region = `${location.name}${location.state ? `, ${location.state}` : ""}`;
  const areaText = (areas.length > 0 ? areas : location.areas ?? []).slice(0, 5);

  const faqs: Faq[] = [
    {
      question: `Are there ${topic} in ${location.name}?`,
      answer: `Owners in ${region} list rooms, flats, houses and shops on ${APP_NAME} every week. You can browse photos, prices and owner contact details on the category pages under ${location.name}.`,
    },
    {
      question: `How do I list my property in ${location.name} on ${APP_NAME} for free?`,
      answer: `Create a free account, go to Add Property, choose the location as ${location.name}, upload photos and submit. Your listing goes live after a quick review by our team.`,
    },
    {
      question: `Which areas in ${location.name} are popular for ${topic}?`,
      answer:
        areaText.length > 0
          ? `Locals commonly search for ${topic} in ${areaText.join(", ")} and nearby. Listing your property in ${location.name} makes it visible to tenants and buyers searching these areas.`
          : `Owners commonly search across ${location.name} and the areas around it. Selecting ${location.name} as the property location keeps your listing visible to the right searchers.`,
    },
    {
      question: `Do you verify properties on ${APP_NAME}?`,
      answer: `Every listing on ${APP_NAME} passes a manual review; properties the owner marks as verified also show a verified badge on the listing card.`,
    },
  ];

  return (
    <section aria-labelledby="location-faq" className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <h2 id="location-faq" className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
        Frequently asked questions
      </h2>
      <div className="mt-4 divide-y divide-slate-100">
        {faqs.map((faq) => (
          <details key={faq.question} className="group py-3">
            <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
              {faq.question}
              <span className="ml-3 shrink-0 text-slate-400 transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{faq.answer}</p>
          </details>
        ))}
      </div>
      <JsonLd data={faqPageJsonLd(faqs)} />
    </section>
  );
}