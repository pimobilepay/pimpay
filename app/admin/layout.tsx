import type { Metadata } from "next";
import { AdminBottomNav } from "@/components/admin/AdminBottomNav";

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
      <div className="flex flex-col">
        {children}
      </div>
      <AdminBottomNav />
    </div>
  );
}
