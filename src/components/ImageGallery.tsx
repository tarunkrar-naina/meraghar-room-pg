"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function ImageGallery({
  images,
  title,
  altText,
}: {
  images: string[];
  title: string;
  altText?: string;
}) {
  const [active, setActive] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-gradient-to-br from-teal-50 to-slate-100 text-slate-400">
        No images available
      </div>
    );
  }

  const index = Math.max(0, Math.min(active, images.length - 1));

  function next() {
    setActive((a) => (a + 1) % images.length);
  }
  function prev() {
    setActive((a) => (a - 1 + images.length) % images.length);
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    if (delta < -40) next();
    else if (delta > 40) prev();
    touchStartX.current = null;
  }

  return (
    <div>
      <div
        className="group relative overflow-hidden rounded-2xl"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Image
          src={images[index]}
          alt={
            altText
              ? `${altText}${images.length > 1 ? ` - photo ${index + 1}` : ""}`
              : `${title} - photo ${index + 1}`
          }
          fill
          priority
          sizes="(min-width: 1024px) 60vw, 100vw"
          className="object-cover"
        />

        <button
          onClick={prev}
          aria-label="Previous image"
          className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition-opacity hover:bg-white lg:opacity-0 lg:group-hover:opacity-100"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <button
          onClick={next}
          aria-label="Next image"
          className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-700 shadow transition-opacity hover:bg-white lg:opacity-0 lg:group-hover:opacity-100"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <span className="absolute bottom-3 right-3 rounded-full bg-slate-900/70 px-2.5 py-1 text-xs font-medium text-white">
          {index + 1} / {images.length}
        </span>
      </div>

      {images.length > 1 && (
        <div ref={scrollRef} className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className={cn(
                "relative h-16 w-24 shrink-0 overflow-hidden rounded-lg ring-2 transition-all",
                i === index ? "ring-teal-600" : "ring-transparent opacity-70 hover:opacity-100"
              )}
            >
              <Image src={src} alt="" fill sizes="6rem" className="object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}