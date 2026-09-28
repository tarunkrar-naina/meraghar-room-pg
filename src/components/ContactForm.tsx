"use client";

import { useId, useState, useTransition } from "react";
import { CheckCircle2, Send } from "lucide-react";
import { submitContactRequest } from "@/lib/actions/contact";
import { trackEvent } from "@/lib/analytics";
import { ADMIN_CONTACT_EMAIL } from "@/lib/constants";

export function ContactForm({
  propertyId,
  requirementId,
  subject = "MeraGhar property enquiry",
  source = "contact",
}: {
  propertyId?: string;
  requirementId?: string;
  subject?: string;
  source?: string;
}) {
  const nameId = useId();
  const phoneId = useId();
  const messageId = useId();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState(`Namaste! Mujhe "${subject}" ke baare mein jaankari chahiye.`);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!name.trim()) return setError("Please enter your name.");
    if (!/^[0-9]{10}$/.test(phone.trim())) return setError("Enter a valid 10-digit mobile number.");
    if (message.trim().length < 10) return setError("Please add a little more detail.");

    startTransition(async () => {
      const result = await submitContactRequest({
        propertyId,
        requirementId,
        name: name.trim(),
        phone: phone.trim(),
        message: message.trim(),
        source,
      });
      if (result.ok) {
        setSent(true);
        trackEvent("generate_lead", { source, property_id: propertyId ?? "", requirement_id: requirementId ?? "" });
      } else {
        setError(result.error ?? "Please try again.");
      }
    });
  }

  if (sent) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center" role="status">
        <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" aria-hidden="true" />
        <p className="mt-2 font-semibold text-emerald-900">Your enquiry has been recorded.</p>
        <p className="mt-1 text-sm text-emerald-800">MeraGhar will contact you shortly.</p>
        <a className="mt-3 inline-block text-sm font-semibold text-teal-700 underline" href={`mailto:${ADMIN_CONTACT_EMAIL}`}>
          Email MeraGhar
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Contact MeraGhar</h2>
        <p className="mt-1 text-sm text-slate-500">Your details are shared only with the MeraGhar team.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor={nameId}>
          Name
          <input id={nameId} value={name} onChange={(event) => setName(event.target.value)} required maxLength={80} className="h-11 rounded-lg border border-slate-300 px-3 font-normal" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor={phoneId}>
          Mobile number
          <input id={phoneId} value={phone} onChange={(event) => setPhone(event.target.value.replace(/\D/g, "").slice(0, 10))} required inputMode="numeric" autoComplete="tel" className="h-11 rounded-lg border border-slate-300 px-3 font-normal" />
        </label>
      </div>
      <label className="grid gap-1 text-sm font-medium text-slate-700" htmlFor={messageId}>
        Message
        <textarea id={messageId} value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={1000} rows={5} className="resize-y rounded-lg border border-slate-300 px-3 py-2 font-normal" />
      </label>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={pending} className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-60">
        <Send className="h-4 w-4" aria-hidden="true" />
        {pending ? "Sending…" : "Send enquiry"}
      </button>
    </form>
  );
}
