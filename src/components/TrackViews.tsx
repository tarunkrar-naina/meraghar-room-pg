"use client";

import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/analytics";

/**
 * Client view tracker. Fires a single fire-and-forget POST to /api/log-view
 * on mount so the server can resolve device type, the signed-in user and a
 * salted visitor hash (no raw IP is ever stored). Fire-and-forget means view
 * logging never blocks rendering nor fails the page.
 */
export function TrackViews({ id }: { id: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    fetch("/api/log-view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: id }),
      keepalive: true,
    }).catch(() => {
      // view logging must never throw in the browser
    });

    trackEvent("view_item", { item_id: id });
  }, [id]);

  return null;
}
