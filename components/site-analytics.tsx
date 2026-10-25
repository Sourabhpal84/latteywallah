"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

const VISITOR_ID_KEY = "lw_visitor_id";

export function SiteAnalytics() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    try {
      let visitorId = window.localStorage.getItem(VISITOR_ID_KEY);
      if (!visitorId) {
        visitorId = window.crypto.randomUUID();
        window.localStorage.setItem(VISITOR_ID_KEY, visitorId);
      }
      void fetch("/api/analytics/visit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, path: pathname }),
        keepalive: true,
      });
    } catch {
      // Analytics should never interrupt shopping if browser storage is unavailable.
    }
  }, [pathname]);

  return null;
}
