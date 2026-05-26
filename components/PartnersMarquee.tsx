"use client";

import Image from "next/image";

const partners = [
  { name: "Visa", logo: "/visa.png" },
  { name: "SimpleSwap", logo: "/simpleswap.png" },
  { name: "ChangeNow", logo: "/changenow.png" },
  { name: "SunSwap", logo: "/sunswap.png" },
];

export function PartnersMarquee() {
  return (
    <section className="mb-8 py-6 rounded-[32px] bg-slate-900/40 border border-white/10 overflow-hidden">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-6 mb-4">
        Nos Partenaires
      </h3>
      <div className="flex justify-center items-center gap-8 px-6 flex-wrap">
        {partners.map((partner, index) => (
          <div
            key={index}
            className="flex flex-col items-center justify-center p-4 min-w-[120px] opacity-80 hover:opacity-100 transition-opacity"
          >
            <div className="h-16 w-24 relative flex items-center justify-center mb-2">
              <Image
                src={partner.logo}
                alt={`${partner.name} logo`}
                width={80}
                height={60}
                className="object-contain"
                style={{ maxHeight: "60px", width: "auto" }}
              />
            </div>
            <span className="text-xs text-slate-400 font-medium mt-1">
              {partner.name}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
