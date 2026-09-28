import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { buildLocalReply } from "@/lib/ai-fallback";

/**
 * AI Agent - talks to Groq's hosted LLM (no API key stored in browser).
 * Server-only. Falls back gracefully when GROQ_API_KEY is not configured.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const MODEL = "openai/gpt-oss-120b";

const SYSTEM_PROMPT = `You are the helpful AI assistant for "MeraGhar" (मेरा घर), a local property
marketplace for Kaithal, Kurukshetra, Pundri and Narwana (कैथल, कुरुक्षेत्र, पुंडरी और नरवाना), Haryana, India.
Your job is to help users find rooms, PGs, flats, houses, shops and plots for rent or sale in
this region. Respond mostly in Hindi (Hinglish) - friendly and concise.
Key facts:
- Contact/WhatsApp: 8950056231, email tarunnaian41@gmail.com, call 8950056231
- Search on the site using the /properties page (filters: city, locality, purpose, type, BHK, price).
- Users must log in to contact a property owner (WhatsApp/Call buttons are login-gated).
- Owners post properties free from the dashboard, which republish them live.
- Keep answers short (2-4 sentences), give actionable steps.
If asked something unrelated to this website, politely redirect to property help.`;

export async function POST(req: Request) {
  let messages: { role: "user" | "assistant" | "system"; content: string }[];
  try {
    const body = await req.json();
    messages = Array.isArray(body?.messages) ? body.messages : [];
    if (messages.length === 0) {
      return NextResponse.json({ error: "No messages provided." }, { status: 400 });
    }
    // Sanity: only accept a limited history to avoid token abuse
    if (messages.length > 30) messages = messages.slice(-30);
    for (const m of messages) {
      if (typeof m.content !== "string") m.content = String(m.content ?? "");
    }
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  let user = null;
  try {
    user = await getAuthUser();
  } catch {
    /* ignore - chat works logged-out too */
  }

const apiKey = process.env.GROQ_API_KEY;
  const lastMessage = messages[messages.length - 1]?.content ?? "";

  /** Offline helper: answers common questions from live DB data when Groq is down. */
  async function offlineReply(): Promise<{ reply: string }> {
    const local = await buildLocalReply(lastMessage);
    return { reply: local.reply };
  }

  if (!apiKey) {
    const offline = await offlineReply();
    return NextResponse.json(
      {
        reply: offline.reply,
        configured: false,
        note: "LLM key missing - serving offline answers",
      },
      { status: 200 }
    );
  }

  const system: { role: "system"; content: string } = {
    role: "system",
    content: `${SYSTEM_PROMPT}\n\nSigned-in user: ${user?.email ?? "guest (not logged in)"}.`,
  };

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [system, ...messages],
        temperature: 0.7,
        max_tokens: 600,
      }),
      cache: "no-store",
    });

if (!res.ok) {
      const detail = await res.text().catch(() => "");
      const offline = await offlineReply();
      return NextResponse.json(
        {
          reply: offline.reply,
          configured: false,
          error: `Groq ${res.status}${detail ? `: ${detail.slice(0, 120)}` : ""} - served offline`,
        },
        { status: 200 }
      );
    }

const data = await res.json();
    const reply = data?.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      const offline = await offlineReply();
      return NextResponse.json({ reply: offline.reply, configured: false }, { status: 200 });
    }
    return NextResponse.json({ reply, configured: true });
  } catch (err) {
    const offline = await offlineReply();
    return NextResponse.json(
      {
        reply: offline.reply,
        configured: false,
        error: `Groq fetch error: ${String(err).slice(0, 120)} - served offline`,
      },
      { status: 200 }
    );
  }
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
