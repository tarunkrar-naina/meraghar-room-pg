import { Phone, MessageCircle } from "lucide-react";
import { fetchAdminLeads } from "@/lib/admin-queries";
import { formatDate, titleCase } from "@/lib/utils";
import { telLink, whatsappLink } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Contact Leads",
};

export default async function AdminLeadsPage() {
  const rows = await fetchAdminLeads();

  return (
    <div>
      <h2 className="mb-2 text-lg font-bold text-slate-900">Contact Leads</h2>
      <p className="mb-6 text-sm text-slate-500">
        Every enquiry made on a property or requirement - sirf aap (admin) ko dikhti hai. Isse aap
        owner/poster se milwa ke brokerage kama sakte hain.
      </p>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-semibold text-slate-700">Abhi koi contact request nahi aayi.</p>
          <p className="mt-1 text-sm text-slate-500">
            Jaisay hi koi customer kisi property/requirement par interest bhejega, yeh yahan aayegi.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((lead) => (
            <div key={lead.id} className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-slate-900">
                  {lead.name} <span className="font-normal text-slate-500">· {lead.phone}</span>
                </p>
                <div className="flex items-center gap-2">
                  {lead.phone && (
                    <>
                      <a
                        href={telLink(lead.phone) ?? "#"}
                        className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                      <a
                        href={whatsappLink(lead.phone, `Namaste ${lead.name}! MeraGhar se aapki interest request mili hai.`) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                      </a>
                    </>
                  )}
                  <span className="text-xs text-slate-400">{formatDate(lead.created_at)}</span>
                </div>
              </div>

              <p className="mt-1 text-sm text-slate-600">
                <span className="font-medium text-slate-800">Interested in:</span>{" "}
                {lead.subject || "(no title)"}{" "}
                <span className="ml-1 rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-semibold text-teal-800 capitalize">
                  {titleCase(lead.source === "shop" ? "shop requirement" : lead.source === "requirement" ? "property requirement" : lead.source)}
                </span>
              </p>
              {lead.message && <p className="mt-1 text-sm text-slate-500">“{lead.message}”</p>}

              {lead.ref_name && (
                <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  <span className="font-semibold text-slate-800">Milkne wale ({titleCase(lead.source === "requirement" ? "poster" : "owner")}):</span>{" "}
                  {lead.ref_name} {lead.ref_phone ? `· ${lead.ref_phone}` : ""}
                  {lead.ref_phone && (
                    <span className="ml-2">
                      <a href={telLink(lead.ref_phone) ?? "#"} className="font-medium text-teal-700 hover:underline">Call ref</a>
                      {" · "}
                      <a
                        href={whatsappLink(lead.ref_phone, `Namaste ${lead.ref_name}! ${lead.name} aapki listing/requirement ke liye interested hain.`) ?? "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-emerald-600 hover:underline"
                      >
                        WhatsApp ref
                      </a>
                    </span>
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}