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
      <div className="relative">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...Array(3)].map((_, setIndex) =>
            partners.map((partner, index) => (
              <div
                key={`${setIndex}-${index}`}
                className="flex items-center justify-center mx-8 min-w-[180px] h-16 opacity-80 hover:opacity-100 transition-opacity"
              >
                <Image
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  width={140}
                  height={50}
                  className="object-contain h-12 w-auto"
                />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
