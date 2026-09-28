import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui";
import { OpenChatButton } from "@/components/ai/OpenChatButton";
import { buildCanonicalUrl } from "@/lib/seo";
import {
  Mail,
  MessageCircle,
  Phone,
  HelpCircle,
  Bot,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Help & Support",
  description:
    "MeraGhar help aur support - property dhundhne, sahi owner se baat karne, ya apni property post karne mein madad. WhatsApp, call ya email se turant sahayata.",
  alternates: { canonical: buildCanonicalUrl("/help/") },
};

const FAQS = [
  {
    q: "Property dhundhne ka tarika kya hai?",
    a: "Home page ya 'Search' se city, area, purpose (rent/buy), BHK aur price filters lagakar property khojon. Har property card par 'View Details' se pura info dikhta hai. Owner ki contact details protected hain - property page par 'Contact MeraGhar Admin' ke zariye turant connect ho sakte hain.",
  },
  {
    q: "Owner se baat karne ke liye kya karna hoga?",
    a: "Sidha owner/poster ka number sabko nahi dikhata taaki sabki privacy safe rahe. Property ya requirement page par button hai - call, WhatsApp ya form se 'interest' bhejiye. MeraGhar team aapko aur owner/poster ko milwa deti hai.",
  },
  {
    q: "Apni property yahan kaise post karein?",
    a: "Login karke 'Post Property' par click karein. Form bhar kar photos + location (map se pin set karein) laga kar 'Save Property' dabayein. Save hote hi property turant sabko dikhne lagti hai - bilkul free.",
  },
  {
    q: "Kaun se cities/areas kaam karte hain?",
    a: "Abhi site Kaithal, Kurukshetra, Pundri aur Narwana, Haryana par focused hai. Cities list mein chaaron dikhte hain, aur Area Map par properties ko pin ke roop mein dekha ja sakta hai.",
  },
  {
    q: "AI Agent kya hai?",
    a: "'AI Agent' ek smart chatbot hai jo aapko Hinglish mein property dhundhne, contact karne aur site use karne mein madad karta hai. Screen ke neeche-teek floating button se khol sakte hain.",
  },
  {
    q: "Kya property post karne ka koi shulk hai?",
    a: "Nahi, post karna bilkul free hai. Na koi listing fee. Owner/poster ka number sirf MeraGhar team ke paas hota hai - sirf sahi interested customer/milaane par hi deal aage badhti hai.",
  },
];

export default function HelpPage() {
  return (
    <Container className="py-10">
      <div className="mb-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-700">
          <HelpCircle className="h-3.5 w-3.5" />
          Help & Support
        </p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          Aapke liye madad yahan hai
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Property dhundhni hai ya apni bechni/deni hai - hum call, WhatsApp, email ya AI Agent
          ke zariye turant help karte hain.
        </p>
      </div>

      {/* Contact options */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="https://wa.me/918950056231?text=Namaste%20MeraGhar,%20mujhe%20property%20ke%20baare%20mein%20help%20chahiye"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-teal-300"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <MessageCircle className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900">WhatsApp</p>
          <p className="mt-1 text-sm text-slate-500">8950056231</p>
          <p className="mt-2 text-xs font-medium text-teal-700">WhatsApp par bhejen &rarr;</p>
        </Link>

        <Link
          href="tel:+918950056231"
          className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-teal-300"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <Phone className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900">Call</p>
          <p className="mt-1 text-sm text-slate-500">8950056231</p>
          <p className="mt-2 text-xs font-medium text-teal-700">Turant baat karein &rarr;</p>
        </Link>

        <Link
          href="mailto:tarunnaian41@gmail.com"
          className="rounded-2xl border border-slate-200 bg-white p-5 transition-colors hover:border-teal-300"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Mail className="h-5 w-5" />
          </span>
          <p className="mt-3 text-sm font-bold text-slate-900">Email</p>
          <p className="mt-1 text-sm text-slate-500">tarunnaian41@gmail.com</p>
          <p className="mt-2 text-xs font-medium text-teal-700">Email bhejen &rarr;</p>
        </Link>
      </div>

      {/* FAQ */}
      <div className="mt-10">
        <h2 className="text-lg font-bold text-slate-900">Sawaal-Jawaab (FAQ)</h2>
        <div className="mt-4 space-y-4">
          {FAQS.map((f) => (
            <div key={f.q} className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-sm font-semibold text-slate-900">{f.q}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{f.a}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 flex flex-col items-start gap-4 rounded-2xl bg-teal-50 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white">
            <Bot className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-slate-900">AI Agent se bhi pooch sakte hain</p>
            <p className="mt-0.5 text-sm text-slate-600">
              Chat karke instantly answer paayein - property dhundhna ho ya site use karna ho.
            </p>
          </div>
        </div>
        <OpenChatButton className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-teal-700">
          Chat kholen
        </OpenChatButton>
      </div>
    </Container>
  );
}
