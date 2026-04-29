import type { Metadata } from "next";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import AdminGlobalCallReceiver from "@/components/AdminGlobalCallReceiver";

export const metadata: Metadata = {
  title: 'Administration | PimPay',
  description: 'Portail de gestion securise PimPay',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen w-full bg-[#02040a] admin-layer">
      {/*
        FIX #3: AdminCallReceiver was only mounted inside admin/support/page.tsx,
        meaning VoIP calls were silently dropped on every other admin page.
        AdminGlobalCallReceiver is a thin "use client" wrapper around AdminCallReceiver
        so it can be imported here from a Server Component layout.
      */}
      <AdminGlobalCallReceiver />
      <div className="flex flex-col">
        {children}
      </div>
      <AdminBottomNav />
    </div>
  );
}
