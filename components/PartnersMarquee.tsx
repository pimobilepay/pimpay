"use client";

import Image from "next/image";

const partners = [
  {
    name: "Visa",
    logo: "/visa.png",
    bgColor: "bg-white",
  },
  {
    name: "SimpleSwap",
    logo: "/simpleswap.png",
    bgColor: "bg-white",
  },
  {
    name: "ChangeNow",
    logo: "/changenow.png",
    bgColor: "bg-white",
  },
  {
    name: "SunSwap",
    logo: "/sunswap.png",
    bgColor: "bg-black",
    wide: true,
  },
];

// Duplicate list for seamless loop
const allPartners = [...partners, ...partners];

export function PartnersMarquee() {
  return (
    <section className="mb-8 py-5 rounded-[32px] bg-slate-900/40 border border-white/10 overflow-hidden">
      {/* Title centered */}
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 text-center mb-5">
        Nos Partenaires
      </h3>

      {/* Marquee container */}
      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-16 z-10 bg-gradient-to-r from-slate-900/80 to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-16 z-10 bg-gradient-to-l from-slate-900/80 to-transparent" />

        <div
          className="flex gap-8 w-max animate-marquee"
          style={{ animationDuration: "25s" }}
        >
          {allPartners.map((partner, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center gap-2 min-w-[100px]"
            >
              <div
                className={`flex items-center justify-center rounded-xl ${partner.bgColor} p-2 shadow-md overflow-hidden`}
                style={{ width: partner.wide ? 120 : 56, height: 56 }}
              >
                <Image
                  src={partner.logo}
                  alt={`${partner.name} logo`}
                  width={partner.wide ? 110 : 48}
                  height={48}
                  className="object-contain w-full h-full"
                />
              </div>
              <span className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">
                {partner.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
      `}</style>
    </section>
  );
}
