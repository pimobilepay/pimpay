import type { Metadata } from "next";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";
import AdminGlobalCallReceiver from "@/components/AdminGlobalCallReceiver";
import AdminGlobalKycNotifier from "@/components/AdminGlobalKycNotifier";

export const metadata: Metadata = {
  title: 'CORE LEDGER | PIMOBIPAY',
  description: 'Portail de gestion securise PIMOBIPAY',
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
      <AdminGlobalKycNotifier />
      <div className="flex flex-col">
        {children}
      </div>
      <AdminBottomNav />
    </div>
  );
}
