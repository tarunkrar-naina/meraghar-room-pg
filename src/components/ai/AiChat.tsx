"use client";

/**
 * Floating "AI Agent" chat assistant. Talks to the server route /api/chat,
 * which calls Groq's hosted LLM (server-side, no key in the browser). Designed
 * to be mobile-first: the launcher hugs the bottom-right and the panel becomes
 * a near-fullscreen sheet on small screens (above the mobile bottom nav).
 */

import { useEffect, useRef, useState, useTransition } from "react";
import { Send, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui";
import { RobotLogo } from "@/components/ai/RobotLogo";

type ChatRole = "user" | "assistant";
interface ChatLine {
  role: ChatRole;
  content: string;
}

const QUICK_PROMPTS = [
  "Kaithal mein 2 BHK rent par milega?",
  "Room rent kitna hota hai yahan?",
  "Property save karne ke baad kya hota hai?",
  "Owner se kaise contact karein?",
];

export function AiChat() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener("open-ai-chat", onOpen);
    return () => window.removeEventListener("open-ai-chat", onOpen);
  }, []);
  const [lines, setLines] = useState<ChatLine[]>([
    {
      role: "assistant",
      content:
        "Namaste! 🙏 Main MeraGhar ka AI Agent hoon. Aapko Kaithal, Kurukshetra, Pundri ya Narwana mein room, PG, flat ya property dhundhne mein madad kar sakta hoon. Kya poochna chahenge?",
    },
  ]);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();
  const [configured, setConfigured] = useState(true);
  const [aiError, setAiError] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  function scrollDown() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || pending) return;
    const history: ChatLine[] = [...lines, { role: "user", content: trimmed }];
    setLines(history);
    setInput("");
    scrollDown();

    startTransition(async () => {
      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages: history.slice(-10).map((l) => ({ role: l.role, content: l.content })),
          }),
        });
        const data = await res.json();
        if (!res.ok || data?.error) {
          throw new Error(data?.error ?? `HTTP ${res.status}`);
        }
        const reply = data?.reply;
        setConfigured(
          typeof data?.configured === "boolean" ? data.configured : configured
        );
        if (!reply) throw new Error("empty reply");
        setLines((prev) => [...prev, { role: "assistant", content: reply }]);
        setAiError(false);
      } catch {
        setAiError(true);
        setLines((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "AI Agent se abhi baat nahi ho saki. Thodi der baad dobara try karein, ya seedha WhatsApp/Call karein: 8950056231.",
          },
        ]);
      }
      setInput("");
      scrollDown();
    });
  }

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) scrollDown();
        }}
        aria-label="Open AI Agent chat"
        className={cn(
          "fixed bottom-[76px] right-4 z-50 flex items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-lg shadow-teal-600/40 ring-4 ring-white/60 transition-all hover:scale-105 hover:bg-teal-700 md:bottom-6 md:right-6",
          open && "scale-0 opacity-0"
        )}
        style={{ height: "3.5rem", width: "3.5rem" }}
      >
        <RobotLogo className="h-8 w-8" />
        <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-75" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400" />
        </span>
      </button>

      {/* Chat panel */}
      {open && (
        <div
          className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl md:inset-x-auto md:bottom-6 md:right-6 md:h-[560px] md:w-[380px] md:rounded-2xl"
          style={{ height: "min(78dvh, 560px)" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-teal-600 px-4 py-3 text-white">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600">
                <RobotLogo className="h-6 w-6" />
              </span>
              <div>
                <p className="text-sm font-semibold leading-tight">MeraGhar AI Agent</p>
                <p className="text-[11px] text-teal-100">
                  {aiError ? "Reconnecting..." : "Always online · Ask in Hindi or English"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="rounded-md p-1.5 text-teal-100 transition-colors hover:bg-white/15 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-4"
          >
            {lines.map((line, i) => (
              <div
                key={i}
                className={cn(
                  "flex",
                  line.role === "user" ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    line.role === "user"
                      ? "rounded-br-sm bg-teal-600 text-white"
                      : "rounded-bl-sm border border-slate-200 bg-white text-slate-800"
                  )}
                >
                  {line.content}
                </div>
              </div>
            ))}
            {pending && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
                </div>
              </div>
            )}
          </div>

          {/* Quick prompts */}
          <div className="flex gap-2 overflow-x-auto border-t border-slate-200 bg-white px-3 py-2">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => !pending && send(q)}
                className="whitespace-nowrap rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 border-t border-slate-200 bg-white px-3 py-2.5"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message AI Agent..."
              className="h-10 flex-1 rounded-full border border-slate-300 bg-slate-50 px-4 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20"
              maxLength={500}
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={pending}
              disabled={!input.trim()}
              className="h-10 w-10 rounded-full p-0"
              aria-label="Send message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
