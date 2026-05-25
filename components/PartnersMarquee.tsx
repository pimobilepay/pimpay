"use client";

const VisaLogo = () => (
  <svg viewBox="0 0 256 83" className="h-8 w-auto" fill="currentColor">
    <path d="M97.197 1.46L64.282 81.066h-21.61L26.47 15.196c-.97-3.81-1.812-5.207-4.762-6.817C16.487 5.587 7.543 2.97 0 1.31L.445 0h34.71c4.418 0 8.388 2.942 9.396 8.03l8.6 45.678L73.87 0l23.326 1.46zm85.17 53.482c.094-20.93-28.934-22.077-28.744-31.424.063-2.84 2.77-5.867 8.696-6.638 2.938-.383 11.03-.676 20.214 3.536l3.6-16.786C180.93 1.665 174.06 0 165.555 0c-21.958 0-37.413 11.67-37.53 28.373-.127 12.357 11.022 19.253 19.433 23.366 8.66 4.203 11.566 6.9 11.532 10.66-.063 5.75-6.91 8.29-13.306 8.39-11.18.173-17.67-3.023-22.846-5.437l-4.032 18.837c5.19 2.39 14.78 4.473 24.728 4.573 23.333 0 38.59-11.522 38.633-29.36m57.955 26.124h20.516L244.03 0h-18.947c-4.259 0-7.85 2.478-9.44 6.29l-33.27 74.776h23.314l4.633-12.826h28.48l2.688 12.826zM219.9 22.84l6.726 32.203h-18.436l11.71-32.203zM168.31 0l-18.364 81.066h-22.21L146.1 0h22.21" />
  </svg>
);

const SimpleSwapLogo = () => (
  <svg viewBox="0 0 200 40" className="h-8 w-auto" fill="currentColor">
    <text x="0" y="30" fontSize="28" fontWeight="bold" fontFamily="Arial, sans-serif">SimpleSwap</text>
  </svg>
);

const ChangeNowLogo = () => (
  <svg viewBox="0 0 180 40" className="h-8 w-auto" fill="currentColor">
    <text x="0" y="30" fontSize="26" fontWeight="bold" fontFamily="Arial, sans-serif">ChangeNOW</text>
  </svg>
);

const SunSwapLogo = () => (
  <svg viewBox="0 0 140 40" className="h-8 w-auto" fill="currentColor">
    <circle cx="18" cy="20" r="12" fill="currentColor" />
    <circle cx="18" cy="20" r="6" fill="#0f172a" />
    <text x="38" y="28" fontSize="22" fontWeight="bold" fontFamily="Arial, sans-serif">SunSwap</text>
  </svg>
);

const partners = [
  { name: "Visa", Logo: VisaLogo },
  { name: "SimpleSwap", Logo: SimpleSwapLogo },
  { name: "ChangeNow", Logo: ChangeNowLogo },
  { name: "SunSwap", Logo: SunSwapLogo },
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
              className="flex items-center justify-center mx-8 min-w-[120px] h-12 text-white opacity-60 hover:opacity-100 transition-opacity"
            >
              <partner.Logo />
            </div>
          ))}
          {/* Duplicate set for seamless loop */}
          {partners.map((partner, index) => (
            <div
              key={`second-${index}`}
              className="flex items-center justify-center mx-8 min-w-[120px] h-12 text-white opacity-60 hover:opacity-100 transition-opacity"
            >
              <partner.Logo />
            </div>
          ))}
          {/* Third set for smoother animation */}
          {partners.map((partner, index) => (
            <div
              key={`third-${index}`}
              className="flex items-center justify-center mx-8 min-w-[120px] h-12 text-white opacity-60 hover:opacity-100 transition-opacity"
            >
              <partner.Logo />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
