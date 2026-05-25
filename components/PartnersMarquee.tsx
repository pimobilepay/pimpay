"use client";

import Image from "next/image";

const partners = [
  {
    name: "Visa",
    logo: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/5e/Visa_Inc._logo.svg/2560px-Visa_Inc._logo.svg.png",
  },
  {
    name: "SimpleSwap",
    logo: "https://simpleswap.io/images/logo_simpleswap.svg",
  },
  {
    name: "ChangeNow",
    logo: "https://changenow.io/images/header/logo-dark.svg",
  },
  {
    name: "SunSwap",
    logo: "https://sunswap.com/static/media/logo.f7a5e5b0.svg",
  },
];

export function PartnersMarquee() {
  return (
    <section className="mb-8 py-6 rounded-[32px] bg-slate-900/40 border border-white/10 overflow-hidden">
      <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 px-6 mb-4">
        Nos Partenaires
      </h3>
      <div className="relative">
        <div className="flex animate-marquee whitespace-nowrap">
          {/* First set of logos */}
          {partners.map((partner, index) => (
            <div
              key={`first-${index}`}
              className="flex items-center justify-center mx-8 min-w-[120px] h-12"
            >
              <img
                src={partner.logo}
                alt={partner.name}
                className="h-8 w-auto object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
          {/* Duplicate set for seamless loop */}
          {partners.map((partner, index) => (
            <div
              key={`second-${index}`}
              className="flex items-center justify-center mx-8 min-w-[120px] h-12"
            >
              <img
                src={partner.logo}
                alt={partner.name}
                className="h-8 w-auto object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
          {/* Third set for smoother animation */}
          {partners.map((partner, index) => (
            <div
              key={`third-${index}`}
              className="flex items-center justify-center mx-8 min-w-[120px] h-12"
            >
              <img
                src={partner.logo}
                alt={partner.name}
                className="h-8 w-auto object-contain brightness-0 invert opacity-60 hover:opacity-100 transition-opacity"
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
