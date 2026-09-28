"use client";

import { useState, useTransition } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleFavorite } from "@/lib/actions/favorite";
import { useRouter } from "next/navigation";

export function SaveButton({
  propertyId,
  initialSaved = false,
  isLoggedIn = false,
}: {
  propertyId: string;
  initialSaved?: boolean;
  isLoggedIn?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoggedIn) {
      router.push(`/login/?next=/properties/${propertyId}/`);
      return;
    }
    startTransition(async () => {
      const result = await toggleFavorite(propertyId);
      if (result.ok) {
        setSaved((s) => !s);
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={saved ? "Remove from saved" : "Save property"}
      title={saved ? "Saved" : "Save"}
      className={cn(
        "inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/95 shadow-sm ring-1 ring-slate-200 transition-colors hover:ring-teal-400",
        saved ? "text-red-500" : "text-slate-400"
      )}
    >
      <Heart className={cn("h-4.5 w-4.5", saved && "fill-current")} />
    </button>
  );
}