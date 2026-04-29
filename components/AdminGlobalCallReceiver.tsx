"use client";

/**
 * FIX #3 — Thin "use client" boundary for AdminCallReceiver.
 *
 * app/admin/layout.tsx is a Server Component (it exports `metadata`).
 * Server Components cannot import Client Components that use hooks directly —
 * they need an explicit "use client" boundary file in between.
 *
 * This wrapper provides that boundary and mounts AdminCallReceiver globally
 * so the admin can receive VoIP calls on ANY page of the admin panel,
 * not just on /admin/support.
 */

import AdminCallReceiver from "@/components/AdminCallReceiver";

export default function AdminGlobalCallReceiver() {
  return <AdminCallReceiver adminId="admin_support" />;
}
