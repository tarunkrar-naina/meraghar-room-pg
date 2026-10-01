"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Loader2, Lock, ShieldCheck, Smartphone } from "lucide-react";
import { signInAdmin, signOut } from "@/lib/actions/auth";
import {
  mfaEnroll,
  mfaHasVerifiedFactor,
  mfaStartChallenge,
  mfaVerifyChallenge,
  mfaVerifyEnrollment,
} from "@/lib/actions/mfa";
import { Button, Field, Input } from "@/components/ui";

type Step = "password" | "setup-2fa" | "verify-2fa";

export function AdminLoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/admin";

  const [step, setStep] = useState<Step>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) return setError("Email aur password daalein.");

    startTransition(async () => {
      const result = await signInAdmin(email, password);
      if (!result.ok) {
        setError(result.error ?? "Login fail ho gaya.");
        return;
      }

      const hasFactor = await mfaHasVerifiedFactor();
      if (hasFactor) {
        const challenge = await mfaStartChallenge();
        if (!challenge.ok) {
          setError(challenge.error ?? "2FA start nahi hua.");
          return;
        }
        setStep("verify-2fa");
        return;
      }

      // No authenticator yet - force enrolment before the panel opens. If MFA is
      // unavailable on the Supabase project, signing out is safer than handing out
      // an unprotected admin session.
      const enrol = await mfaEnroll();
      if (!enrol.ok) {
        await signOut();
        setError(
          "2FA set up nahi ho paya. Supabase me MFA enable karein, phir dobara login karein."
        );
        return;
      }
      setQrCode(enrol.qrCode ?? "");
      setSecret(enrol.secret ?? "");
      setStep("setup-2fa");
    });
  }

  function submitEnrollment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await mfaVerifyEnrollment(code);
      if (!result.ok) {
        setError(result.error ?? "Code sahi nahi hai.");
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  function submitChallenge(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    startTransition(async () => {
      const result = await mfaVerifyChallenge(code);
      if (!result.ok) {
        setError(result.error ?? "Code sahi nahi hai.");
        return;
      }
      router.replace(next);
      router.refresh();
    });
  }

  return (
    <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl sm:p-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
          <ShieldCheck className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-base font-bold text-white">MeraGhar Admin</h1>
          <p className="text-xs text-slate-400">Sirf admin account ke liye</p>
        </div>
      </div>

      {error && (
        <p className="mt-5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      )}

      {step === "password" && (
        <form onSubmit={submitPassword} className="mt-6 space-y-4">
          <Field label="Admin email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="admin@example.com"
              required
              className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
            />
          </Field>
          <Button type="submit" loading={pending} className="w-full">
            <KeyRound className="h-4 w-4" /> Login
          </Button>
          <p className="text-center text-xs leading-5 text-slate-500">
            5 galat try ke baad 15 minute ka wait lagega.
          </p>
        </form>
      )}

      {step === "setup-2fa" && (
        <form onSubmit={submitEnrollment} className="mt-6 space-y-4">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-200">
            <p className="font-semibold">Ek step aur - 2FA set karein</p>
            <p className="mt-1 text-xs leading-5">
              Password ke saath mobile ka bhi code lagega. Isse koi aur aapke account
              me login nahi kar sakta, chahe password leak ho jaye.
            </p>
          </div>

          {qrCode ? (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCode}
                alt="Authenticator QR code"
                className="h-48 w-48 rounded-lg bg-white p-2"
              />
              <p className="text-center text-xs text-slate-400">
                App me scan karein: Google Authenticator, Authy, ya 1Password.
              </p>
            </div>
          ) : (
            <p className="flex items-center justify-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" /> QR code ban raha hai...
            </p>
          )}

          {secret && (
            <p className="break-all rounded-lg bg-slate-800 px-3 py-2 text-center font-mono text-xs text-slate-300">
              <span className="text-slate-500">Manual key: </span>
              {secret}
            </p>
          )}

          <Field label="App se 6-digit code">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              required
              className="border-slate-700 bg-slate-800 text-center font-mono text-lg tracking-widest text-white placeholder:text-slate-600"
            />
          </Field>
          <Button type="submit" loading={pending} className="w-full">
            <Smartphone className="h-4 w-4" /> Verify aur panel kholein
          </Button>
        </form>
      )}

      {step === "verify-2fa" && (
        <form onSubmit={submitChallenge} className="mt-6 space-y-4">
          <div className="flex items-start gap-3 rounded-lg border border-slate-700 bg-slate-800 p-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
            <p className="text-sm leading-5 text-slate-300">
              Authenticator app me MeraGhar ka 6-digit code daalein.
            </p>
          </div>
          <Field label="6-digit code">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              required
              className="border-slate-700 bg-slate-800 text-center font-mono text-lg tracking-widest text-white placeholder:text-slate-600"
            />
          </Field>
          <Button type="submit" loading={pending} className="w-full">
            <Smartphone className="h-4 w-4" /> Verify
          </Button>
          <button
            type="button"
            onClick={() => {
              setCode("");
              setError("");
              setStep("password");
            }}
            className="w-full text-center text-xs text-slate-400 hover:text-white"
          >
            Password wapas daalein
          </button>
        </form>
      )}

      <div className="mt-6 border-t border-slate-800 pt-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Website par wapas
        </Link>
      </div>
    </div>
  );
}