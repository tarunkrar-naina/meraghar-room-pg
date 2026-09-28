"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getPublicEnv } from "@/lib/env";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function Analytics() {
  const gaId = getPublicEnv().gaMeasurementId;
  const pathname = usePathname();
  const initialized = useRef(false);

  useEffect(() => {
    if (!gaId || initialized.current) return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => {
      window.dataLayer!.push(args);
    };
    window.gtag("js", new Date());
    window.gtag("config", gaId, {
      anonymize_ip: true,
      send_page_view: false,
    });
    initialized.current = true;
  }, [gaId]);

  useEffect(() => {
    if (!gaId || !initialized.current || !pathname) return;
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [gaId, pathname]);

  if (!gaId) return null;
  return <script async src={`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(gaId)}`} />;
}
