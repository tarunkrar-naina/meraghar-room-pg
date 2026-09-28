"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Mail, MessageCircle, Phone, Send, ShieldCheck } from "lucide-react";
import { submitContactRequest } from "@/lib/actions/contact";
import { trackEvent } from "@/lib/analytics";
import {
  ADMIN_CONTACT_EMAIL,
  ADMIN_CONTACT_PHONE,
  ADMIN_CONTACT_PHONE_INTL,
  ADMIN_WHATSAPP_NUMBER,
} from "@/lib/constants";

/**
 * Public "Contact Admin" card. Owner/poster numbers are hidden; every
 * customer reachouts is routed through the MeraGhar admin, and the interest
 * is stored as a lead for the admin panel.
 */
export function AdminContactCard({
  propertyId,
  requirementId,
  subject,
  isShop = false,
}: {
  propertyId?: string;
  requirementId?: string;
  subject: string;
  isShop?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(
    isShop
      ? "Namaste, mujhe apne business ke liye shop chahiye. Detail bhejein."
      : `Namaste! Mujhe "${subject}" ke baare mein aur jaankari chahiye.`
  );
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const waText = `Namaste! Maine MeraGhar par interest dikhaya hai: "${subject}". Meri jaankari: ${name || "—"}`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) return setError("Apna naam likhein.");
    if (!/^[0-9]{10}$/.test(phone.trim())) return setError("10-digit mobile number likhein.");

    startTransition(async () => {
      const res = await submitContactRequest({
        propertyId,
        requirementId,
        name: name.trim(),
        phone: phone.trim(),
        message: message.trim(),
        source: isShop ? "shop" : propertyId ? "property" : "requirement",
      });
      if (res.ok) {
        setSent(true);
        trackEvent("generate_lead", {
          source: isShop ? "shop" : propertyId ? "property" : "requirement",
          property_id: propertyId ?? "",
          requirement_id: requirementId ?? "",
        });
      } else {
        setError(res.error ?? "Kuch galat hua, dobara try karein.");
      }
    });
  }

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/50 p-4">
      <div className="flex items-center gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-teal-900">MeraGhar Admin helps you</p>
          <p className="text-xs text-teal-700">
            Owner/poster ki details sirf MeraGhar team ke paas - contact yahan se karein.
          </p>
        </div>
      </div>

      {sent ? (
        <div className="mt-3 rounded-xl border border-emerald-200 bg-white p-4 text-center">
          <CheckCircle2 className="mx-auto h-7 w-7 text-emerald-600" />
          <p className="mt-1.5 text-sm font-bold text-slate-800">Interest recorded!</p>
          <p className="mt-0.5 text-xs text-slate-500">
            MeraGhar team aapse {phone} par contact karegi. Turant baat ke liye call/WhatsApp:
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <a href={`tel:${ADMIN_CONTACT_PHONE_INTL}`} className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700">
              <Phone className="h-3.5 w-3.5" /> {ADMIN_CONTACT_PHONE}
            </a>
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </div>
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-wrap gap-2">
            <a
              href={`tel:${ADMIN_CONTACT_PHONE_INTL}`}
              className="inline-flex h-10 min-w-32 flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700"
            >
              <Phone className="h-4 w-4" /> Call Admin
            </a>
            <a
              href={`https://wa.me/${ADMIN_WHATSAPP_NUMBER}?text=${encodeURIComponent(waText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 min-w-32 flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <MessageCircle className="h-4 w-4" /> WhatsApp Admin
            </a>
          </div>
          <a
            href={`mailto:${ADMIN_CONTACT_EMAIL}?subject=${encodeURIComponent(`Interest: ${subject}`)}`}
            className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-teal-700 hover:text-teal-800"
          >
            <Mail className="h-3.5 w-3.5" /> {ADMIN_CONTACT_EMAIL}
          </a>

          <form onSubmit={submit} className="mt-3 rounded-xl border border-teal-200 bg-white p-3">
            <p className="text-xs font-bold text-slate-700">Ya apna interest yahan bhejein</p>
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
            <div className="mt-2 flex flex-wrap gap-2">
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Naam"
                className="h-9 min-w-32 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:border-teal-500 focus:outline-none"
              />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                placeholder="Mobile number"
                inputMode="numeric"
                className="h-9 min-w-32 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm focus:border-teal-500 focus:outline-none"
              />
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={2}
              className="mt-2 w-full resize-none rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={pending}
              className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg bg-teal-600 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" /> {pending ? "Sending..." : "Send interest"}
            </button>
            <p className="mt-1.5 text-[11px] text-slate-400">
              Aapki details sirf MeraGhar team dekh sakti hai - kisi ko direct share nahi hoti.
            </p>
          </form>
        </>
      )}
    </div>
  );
}