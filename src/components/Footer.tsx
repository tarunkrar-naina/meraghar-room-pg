import Link from "next/link";
import { Home, Mail, MapPin, ShieldAlert } from "lucide-react";
import { Container } from "@/components/ui";
import { fetchActiveLocations } from "@/lib/locations";

export async function Footer() {
  const locations = await fetchActiveLocations();

  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50">
      <Container className="py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-600 text-white">
                <Home className="h-5 w-5" />
              </span>
              <span className="text-xl font-extrabold tracking-tight text-slate-900">
                Mera<span className="text-teal-600">Ghar</span>
              </span>
            </div>
            <p className="mt-3 text-sm text-slate-500">
               MeraGhar is the local property marketplace for Kaithal, Kurukshetra, Pundri &amp; Narwana, Haryana.
               Rent, buy, or list your property — all in one place, absolutely free.
            </p>
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
              <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> Kaithal, Haryana, India</span>
              <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> hello@meraghar.in</span>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <ShieldAlert className="h-4 w-4" />
            Never send money before personally verifying the property and owner.
          </p>
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} MeraGhar. Demo project - verify listings personally.
          </p>
        </div>
      </Container>
    </footer>
  );
}