import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  Home,
  FileText,
  MapPin,
  Megaphone,
  ShieldAlert,
  Store,
} from "lucide-react";
import { Container, SectionHeading, EmptyState } from "@/components/ui";
import { SearchBar } from "@/components/SearchBar";
import { PropertyCard } from "@/components/PropertyCard";
import { PropertyGrid } from "@/components/PropertyGrid";
import { CitySelector } from "@/components/CitySelector";
import { CategoryNav } from "@/components/CategoryNav";
import { RequirementsBoard } from "@/components/requirements/RequirementsBoard";
import { fetchCities, fetchLocalities, fetchPublicProperties, fetchRequirements } from "@/lib/queries";
import { getAuthUser } from "@/lib/auth";
import { APP_SUBTITLE, APP_TAGLINE, APP_TAGLINE_HINDI, DEFAULT_CITIES } from "@/lib/constants";
import { JsonLd } from "@/components/JsonLd";
import { generateSchemaMarkup, generateMetadata as generateSeoMetadata } from "@/lib/seo";
import { SEO_CITIES } from "@/lib/seo-config";
import { getSetting } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return generateSeoMetadata("home", { path: "/" });
}

export default async function HomePage() {
  const [cities, localities] = await Promise.all([fetchCities(), fetchLocalities()]);
  const cityList = cities.length > 0 ? cities : DEFAULT_CITIES;

  const user = await getAuthUser();
  const isLoggedIn = Boolean(user);

  const [featured, latest, rentProperties, saleProperties, shopProperties, requirements] = await Promise.all([
    fetchPublicProperties({ featuredOnly: true, pageSize: 6 }),
    fetchPublicProperties({ pageSize: 8 }),
    fetchPublicProperties({ purpose: "rent", pageSize: 6 }),
    fetchPublicProperties({ purpose: "sale", pageSize: 6 }),
    fetchPublicProperties({ type: "shop", pageSize: 3 }),
    fetchRequirements(),
  ]);

  const [heroTitle, heroSubtitle] = await Promise.all([
    getSetting("hero_title", APP_TAGLINE),
    getSetting("hero_subtitle", APP_SUBTITLE),
  ]);

  const popularLocalities = localities.slice(0, 8);

  return (
    <>
      {/* ---------- Hero ---------- */}
      <section
        className="relative overflow-hidden bg-slate-900"
        style={{
          backgroundImage:
            "radial-gradient(80rem 30rem at 80% -10%, rgba(13,148,136,0.45), transparent), linear-gradient(135deg, #134e4a 0%, #0f172a 60%, #1e293b 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "url(data:image/svg+xml,%3Csvg%20width%3D%2260%22%20height%3D%2260%22%20viewBox%3D%220%200%2060%2060%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cpath%20d%3D%22M30%200v30M0%2030h60%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E)" }} />
        <Container className="relative py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-teal-300 ring-1 ring-white/20">
              <MapPin className="h-3.5 w-3.5" />
                Kaithal · Kurukshetra · Pundri · Narwana
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-tight tracking-tight text-white sm:text-5xl">
              {heroTitle}
            </h1>
            <p className="mt-2 text-sm font-medium text-teal-200 sm:text-base">{APP_TAGLINE_HINDI}</p>
            <p className="mx-auto mt-4 max-w-xl whitespace-pre-line text-base text-slate-300 sm:text-lg">
              {heroSubtitle}
            </p>
          </div>
          <div className="mt-10">
            <SearchBar cities={cityList} />
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm text-slate-300">
            <span className="text-slate-400">Popular:</span>
            {popularLocalities.length > 0
              ? popularLocalities.slice(0, 6).map((l) => (
                  <Link
                    key={l.id}
                    href={`/properties?city=${encodeURIComponent(l.city)}&locality=${encodeURIComponent(l.locality)}`}
                    className="rounded-full bg-white/10 px-3 py-1 font-medium text-white transition-colors hover:bg-white/20"
                  >
                    {l.locality}, {l.city}
                  </Link>
                ))
              : ["City Centre", "New Colony", "Pehowa Road", "Main Bazaar"].map((loc) => (
                  <span key={loc} className="rounded-full bg-white/10 px-3 py-1">{loc}</span>
                ))}
          </div>
        </Container>
      </section>

      <section className="py-10">
        <Container>
          <CategoryNav citySlug="kaithal" heading="Find a property for rent or sale" />
        </Container>
      </section>

      <section className="py-4">
        <Container>
          <CitySelector heading="Explore properties by city" />
        </Container>
      </section>

      {/* ---------- Featured ---------- */}
      {featured.properties.length > 0 && (
        <section className="py-10">
          <Container>
            <SectionHeading
              title="Featured Properties"
              subtitle="Hand-picked verified listings"
              action={
                <Link href="/properties" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700">
                  View all <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {featured.properties.map((p) => (
                <PropertyCard key={p.id} property={p} isLoggedIn={isLoggedIn} />
              ))}
            </div>
          </Container>
        </section>
      )}

      {/* ---------- Latest ---------- */}
      <section className="bg-white py-10">
        <Container>
          <SectionHeading
            title="Latest Properties"
               subtitle="Freshly added in Kaithal, Kurukshetra, Pundri & Narwana"
            action={
              <Link href="/properties" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700">
                See all listings <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          {latest.properties.length === 0 ? (
            <EmptyState
              icon={<Home className="h-7 w-7" />}
              title="No properties found yet"
              description="Listings posted by owners will appear here once approved."
            />
          ) : (
            <PropertyGrid properties={latest.properties} isLoggedIn={isLoggedIn} />
          )}
        </Container>
      </section>

      {/* ---------- Latest Requirements ---------- */}
      <section className="py-10">
        <Container>
          <SectionHeading
            title="Latest Property Requirements"
             subtitle="Log kya dhoondh rahe hain in Kaithal, Kurukshetra, Pundri & Narwana"
            action={
              <Link href="/requirements" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700">
                View all requirements <ArrowRight className="h-4 w-4" />
              </Link>
            }
          />
          {requirements.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-7 w-7" />}
              title="No requirements yet"
              description="Padhe likhe buyers/tenants ke requirements yahan dikhenge."
            />
          ) : (
            <RequirementsBoard requirements={requirements.slice(0, 4)} />
          )}
          <div className="mt-6 text-center">
            <Link
              href="/post-requirement"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-teal-600 px-6 text-sm font-semibold text-white transition-colors hover:bg-teal-700"
            >
              <FileText className="h-4 w-4" />
              Post Your Requirement
            </Link>
          </div>
        </Container>
      </section>

      {/* ---------- Rent / Sale split ---------- */}
      <section className="py-10">
        <Container className="space-y-12">
          <div>
            <SectionHeading
              title="Flats, Houses & Rooms for Rent"
              action={
                <Link href="/properties?purpose=rent" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700">
                  More rentals <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            {rentProperties.properties.length === 0 ? (
              <EmptyState title="No rental listings yet" description="Rooms, PGs and flats for rent will appear here." />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rentProperties.properties.map((p) => (
                  <PropertyCard key={p.id} property={p} isLoggedIn={isLoggedIn} />
                ))}
              </div>
            )}
          </div>

          <div>
            <SectionHeading
              title="Properties for Sale"
              action={
                <Link href="/properties?purpose=sale" className="inline-flex items-center gap-1 text-sm font-semibold text-teal-600 hover:text-teal-700">
                  More for sale <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            {saleProperties.properties.length === 0 ? (
              <EmptyState title="No sale listings yet" description="Flats, houses, shops and plots for sale will appear here." />
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {saleProperties.properties.map((p) => (
                  <PropertyCard key={p.id} property={p} isLoggedIn={isLoggedIn} />
                ))}
              </div>
            )}
          </div>
        </Container>
      </section>

      {/* ---------- Shops & business space ---------- */}
      <section className="py-10">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-teal-950 to-teal-900 px-6 py-10 sm:px-10">
            <div className="relative">
              <div className="mb-6">
                <h2 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Shops & Business Spaces</h2>
                <p className="mt-1 text-teal-200">Shop chahiye apne business ke liye? Ya apni shop rent/bechni hai?</p>
              </div>
              {shopProperties.properties.length > 0 && (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
                  {shopProperties.properties.map((p) => (
                    <PropertyCard key={p.id} property={p} isLoggedIn={isLoggedIn} />
                  ))}
                </div>
              )}

              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/post-requirement?type=shop"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-500 px-8 text-base font-bold text-white transition-colors hover:bg-amber-600"
                >
                  <Store className="h-5 w-5" />
                  Mujhe shop chahiye (business ke liye)
                </Link>
                <Link
                  href="/properties?type=shop"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/10 px-8 text-base font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/20"
                >
                  <Building2 className="h-5 w-5" />
                  Browse available shops
                </Link>
              </div>
              <p className="mt-5 text-center text-sm text-teal-200">
                Apni shop/dukaan bechna ya rent par dena hai?{" "}
                <Link href="/post-requirement" className="font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200">
                  Yahan contact karein
                </Link>
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- List your property CTA ---------- */}
      <section className="py-12">
        <Container>
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-teal-700 to-teal-900 px-6 py-12 text-center sm:px-12">
            <div className="relative">
              <h2 className="text-2xl font-extrabold text-white sm:text-3xl">
                Property list karni hai?
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-teal-100">
                Apna room, flat ya house rent par dena hai ya bechna hai? MeraGhar team se
                contact karein — hum aapki property ke liye sahi tenants/buyers dhundein
                aur poori listing manage karein.
              </p>
              <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/post-requirement"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-amber-500 px-8 text-base font-bold text-white transition-colors hover:bg-amber-600"
                >
                  <Megaphone className="h-5 w-5" />
                  MeraGhar se contact karein
                </Link>
                <Link
                  href="/post-requirement"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-white/10 px-8 text-base font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/20"
                >
                  <FileText className="h-5 w-5" />
                  Post Your Requirement
                </Link>
              </div>
              <p className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-amber-200">
                <ShieldAlert className="h-4 w-4" />
                Never send money before personally verifying the property and owner.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* ---------- Trust ---------- */}
      <section className="pb-16">
        <Container>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: BadgeCheck, title: "Verified Owner Badges", text: "Verified listings carry a badge so you know the owner is genuine." },
              { icon: ShieldAlert, title: "Report Suspicious Listings", text: "See a scam? Report any listing and our team reviews it." },
              { icon: MapPin, title: "Local, City by City", text: "Explore Kaithal, Kurukshetra, Pundri and Narwana with listings from local owners." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
                  <Icon className="h-6 w-6" />
                </span>
                <h3 className="mt-4 font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <JsonLd
        data={generateSchemaMarkup("ItemList", {
          items: latest.properties.map((property) => ({
            name: property.title,
            url: `/properties/${property.id}`,
          })),
        })}
      />
      <JsonLd
        data={generateSchemaMarkup("LocalBusiness", {
          cities: SEO_CITIES.map((city) => city.name),
        })}
      />
    </>
  );
}