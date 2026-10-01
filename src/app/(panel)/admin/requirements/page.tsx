import { Phone, MessageCircle } from "lucide-react";
import { fetchAdminRequirements } from "@/lib/admin-queries";
import { formatDate, formatINR, titleCase } from "@/lib/utils";
import { telLink, whatsappLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Requirements",
};

export default async function AdminRequirementsPage() {
  const rows = await fetchAdminRequirements();

  return (
    <div>
      <h2 className="mb-2 text-lg font-bold text-slate-900">Customer Requirements</h2>
      <p className="mb-6 text-sm text-slate-500">
        Customers ka contact sirf aapko dikhta hai. Matching property owner dhoondhke inhe milwaayein.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-semibold text-slate-700">Abhi koi requirement nahi hai.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((req) => (
            <div key={req.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{req.title || "Property requirement"}</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800 capitalize">
                    {req.status}
                  </span>
                  <span className="text-xs text-slate-400">{formatDate(req.created_at)}</span>
                </div>
              </div>

              <p className="mt-1 text-xs text-slate-500">
                {[titleCase(req.purpose), titleCase(req.property_type), req.city, req.locality].filter(Boolean).join(" · ")}
              </p>
              {req.description && <p className="mt-1 text-sm text-slate-600">“{req.description}”</p>}
              {(req.budget_min || req.budget_max) && (
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  Budget: {req.budget_min ? formatINR(req.budget_min) : "Any"} –{" "}
                  {req.budget_max ? `${formatINR(req.budget_max)} max` : "No limit"}
                </p>
              )}

              <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="font-semibold text-slate-800">Poster:</span>{" "}
                {req.poster_name ?? "—"} {req.poster_phone ? `· ${req.poster_phone}` : ""}
                {req.poster_phone && (
                  <span className="flex items-center gap-2">
                    <a href={telLink(req.poster_phone) ?? "#"} className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 text-xs font-semibold text-white hover:bg-teal-700">
                      <Phone className="h-3 w-3" /> Call
                    </a>
                    <a
                      href={whatsappLink(req.poster_phone, "Namaste! MeraGhar admin se aapki requirement ke liye baat karni hai.") ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <MessageCircle className="h-3 w-3" /> WhatsApp
                    </a>
                  </span>
                )}
                <span className="ml-auto text-xs text-slate-400 capitalize">
                  Prefer: {req.contact_preference || "phone"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}