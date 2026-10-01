import Link from "next/link";
import { ExternalLink, Home, Mail, MapPin, Phone, ShieldAlert } from "lucide-react";
import { Container } from "@/components/ui";
import { fetchActiveLocations } from "@/lib/locations";
import { getSetting } from "@/lib/site-settings";

/** Splits a site name like "MeraGhar" so the "Ghar" half can be teal. */
function SiteName({ name }: { name: string }) {
  const teal = name.slice(4);
  const base = teal ? name.slice(0, 4) : name;

  return (
    <span className="text-xl font-extrabold tracking-tight text-slate-900">
      {base}
      {teal && <span className="text-teal-600">{teal}</span>}
    </span>
  );
}

export async function Footer() {
  const [locations, siteName, footerNote, phone, email, address, social] = await Promise.all([
    fetchActiveLocations(),
    getSetting("site_name", "MeraGhar"),
    getSetting(
      "footer_note",
      "MeraGhar is the local property marketplace for Kaithal, Kurukshetra, Pundri & Narwana, Haryana. Rent, buy, or list your property — all in one place, absolutely free."
    ),
    getSetting("contact_phone", "8950056231"),
    getSetting("contact_email", "hello@meraghar.in"),
    getSetting("contact_address"),
    Promise.all([
      getSetting("social_instagram"),
      getSetting("social_facebook"),
      getSetting("social_youtube"),
    ]),
  ]);

  const [instagram, facebook, youtube] = social;
  // lucide 1.x dropped brand icons, so the social links are text pills.
  const socialLinks = [
    { href: instagram, label: "Instagram" },
    { href: facebook, label: "Facebook" },
    { href: youtube, label: "YouTube" },
  ].filter((link) => link.href.startsWith("http"));

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <Container className="py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
                <Home className="h-5 w-5" />
              </span>
              <SiteName name={siteName} />
            </div>
            <p className="mt-3 text-sm text-slate-500">{footerNote}</p>

            {socialLinks.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {socialLinks.map(({ href, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 transition-colors hover:bg-teal-600 hover:text-white"
                  >
                    {label}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Explore</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link className="hover:text-teal-600" href="/properties?purpose=rent">Rent Properties</Link></li>
              <li><Link className="hover:text-teal-600" href="/properties?purpose=sale">Buy Properties</Link></li>
              <li><Link className="hover:text-teal-600" href="/properties/">All Properties</Link></li>
              <li><Link className="hover:text-teal-600" href="/requirements/">Requirements</Link></li>
              <li><Link className="hover:text-teal-600" href="/about/">About MeraGhar</Link></li>
              <li><Link className="hover:text-teal-600" href="/contact/">Contact</Link></li>
              <li><Link className="hover:text-teal-600" href="/how-it-works/">How It Works</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Services</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link className="hover:text-teal-600" href="/post-requirement">Post Requirement</Link></li>
              <li><Link className="hover:text-teal-600" href="/requirements/">Property Requests</Link></li>
              <li><Link className="hover:text-teal-600" href="/how-it-works/">How It Works</Link></li>
              <li><Link className="hover:text-teal-600" href="/contact/">Contact Support</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-slate-900">Cities</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {locations.slice(0, 7).map((loc) => (
                <li key={loc.id}>
                  <Link className="hover:text-teal-600" href={`/${loc.slug}/`}>
                    {loc.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-col gap-1 text-xs text-slate-500">
              {address && (
                <span className="inline-flex items-start gap-1">
                  <MapPin className="mt-0.5 h-3 w-3 shrink-0" /> {address}
                </span>
              )}
              {phone && (
                <a
                  href={`tel:+91${phone.replace(/\D/g, "")}`}
                  className="inline-flex items-center gap-1 hover:text-teal-700"
                >
                  <Phone className="h-3 w-3" /> {phone}
                </a>
              )}
              {email && (
                <a
                  href={`mailto:${email}`}
                  className="inline-flex items-center gap-1 hover:text-teal-700"
                >
                  <Mail className="h-3 w-3" /> {email}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <ShieldAlert className="h-4 w-4" />
            Never send money before personally verifying the property and owner.
          </p>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} {siteName}. Demo project - verify listings personally.
          </p>
        </div>
      </Container>
    </footer>
  );
}