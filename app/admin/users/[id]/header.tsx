"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function UserDetailHeader({ userName, userId }: { userName: string; userId: string }) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-50 bg-[#020617]/90 backdrop-blur-xl border-b border-white/[0.06]">
      <div className="flex items-center justify-between px-5 py-4 max-w-2xl mx-auto">
        <button onClick={() => router.push("/admin/users")} className="p-2.5 bg-white/5 rounded-2xl text-white active:scale-95 transition-transform">
          <ArrowLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-[9px] font-black text-blue-500 uppercase tracking-[4px]">PimPay</p>
          <h1 className="text-sm font-black text-white uppercase tracking-wider">{userName}</h1>
        </div>
        <div className="w-11" />
      </div>
    </div>
  );
}
