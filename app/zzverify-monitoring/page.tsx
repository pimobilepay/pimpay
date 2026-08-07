"use client";

import AdminMonitoringPage from "@/app/admin/monitoring/page";

if (typeof window !== "undefined" && !(window as any).__patched) {
  (window as any).__patched = true;
  const orig = window.fetch.bind(window);
  window.fetch = ((input: any, init?: any) => {
    const url = typeof input === "string" ? input : input?.url ?? "";
    if (url.includes("/api/admin/monitoring")) {
      return orig("/api/zzverify-monitoring", init);
    }
    return orig(input, init);
  }) as typeof window.fetch;
}

export default function VerifyMonitoring() {
  return <AdminMonitoringPage />;
}
