import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { Container } from "@/components/ui";
import { ContactForm } from "@/components/ContactForm";
import { JsonLd } from "@/components/JsonLd";
import { ADMIN_CONTACT_EMAIL, ADMIN_CONTACT_PHONE, ADMIN_CONTACT_PHONE_INTL } from "@/lib/constants";
import { generateMetadata as buildSeoMetadata, generateSchemaMarkup } from "@/lib/seo";
import { SEO_CITIES } from "@/lib/seo-config";

export const metadata: Metadata = buildSeoMetadata("static", {
  title: "Contact MeraGhar | Property Help in Haryana",
  description: "Contact MeraGhar for help finding a room, PG, flat, house or shop in Kaithal, Kurukshetra, Pundri and Narwana.",
  path: "/contact/",
  keywords: ["contact MeraGhar", "property contact Haryana", "room rental contact"],
});

export default function ContactPage() {
  return (
    <>
      <Container className="py-10 sm:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wider text-teal-700">Contact MeraGhar</p>
            <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Let us help you find a property</h1>
            <p className="mt-4 leading-7 text-slate-600">Send us your requirement and the MeraGhar team will connect you with suitable local property options.</p>
            <div className="mt-8 space-y-4 text-sm text-slate-700">
              <a className="flex items-center gap-3 hover:text-teal-700" href={`tel:${ADMIN_CONTACT_PHONE_INTL}`}>
                <Phone className="h-5 w-5 text-teal-600" aria-hidden="true" />
                <span>{ADMIN_CONTACT_PHONE} / {ADMIN_CONTACT_PHONE_INTL}</span>
              </a>
              <a className="flex items-center gap-3 hover:text-teal-700" href={`mailto:${ADMIN_CONTACT_EMAIL}`}>
                <Mail className="h-5 w-5 text-teal-600" aria-hidden="true" />
                <span>{ADMIN_CONTACT_EMAIL}</span>
              </a>
              <p className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-teal-600" aria-hidden="true" />
                <span>Serving {SEO_CITIES.map((city) => city.name).join(", ")}</span>
              </p>
            </div>
          </div>
          <ContactForm subject="General property enquiry" source="contact-page" />
        </div>
      </Container>
      <JsonLd data={generateSchemaMarkup("LocalBusiness", { cities: SEO_CITIES.map((city) => city.name) })} />
    </>
  );
}
