"use client";

const VisaLogo = () => (
  <svg viewBox="0 0 256 83" className="h-6 w-auto" fill="currentColor">
    <path d="M97.197 1.46L64.282 81.066h-21.61L26.47 15.196c-.97-3.81-1.812-5.207-4.762-6.817C16.487 5.587 7.543 2.97 0 1.31L.445 0h34.71c4.418 0 8.388 2.942 9.396 8.03l8.6 45.678L73.87 0l23.326 1.46zm85.17 53.482c.094-20.93-28.934-22.077-28.744-31.424.063-2.84 2.77-5.867 8.696-6.638 2.938-.383 11.03-.676 20.214 3.536l3.6-16.786C180.93 1.665 174.06 0 165.555 0c-21.958 0-37.413 11.67-37.53 28.373-.127 12.357 11.022 19.253 19.433 23.366 8.66 4.203 11.566 6.9 11.532 10.66-.063 5.75-6.91 8.29-13.306 8.39-11.18.173-17.67-3.023-22.846-5.437l-4.032 18.837c5.19 2.39 14.78 4.473 24.728 4.573 23.333 0 38.59-11.522 38.633-29.36m57.955 26.124h20.516L244.03 0h-18.947c-4.259 0-7.85 2.478-9.44 6.29l-33.27 74.776h23.314l4.633-12.826h28.48l2.688 12.826zM219.9 22.84l6.726 32.203h-18.436l11.71-32.203zM168.31 0l-18.364 81.066h-22.21L146.1 0h22.21" />
  </svg>
);

const SimpleSwapLogo = () => (
  <svg viewBox="0 0 200 50" className="h-6 w-auto" fill="currentColor">
    <circle cx="20" cy="25" r="15" fill="#3b82f6" />
    <path d="M14 22l6-4v3h6v2h-6v3l-6-4z" fill="white" />
    <path d="M26 28l-6 4v-3h-6v-2h6v-3l6 4z" fill="white" />
    <text x="42" y="32" fontSize="18" fontWeight="700" fill="currentColor" fontFamily="system-ui, sans-serif">SimpleSwap</text>
  </svg>
);

const ChangeNowLogo = () => (
  <svg viewBox="0 0 200 50" className="h-6 w-auto" fill="currentColor">
    <circle cx="20" cy="25" r="15" fill="#10b981" />
    <path d="M13 25c0-4.4 3.6-8 8-8v4c-2.2 0-4 1.8-4 4h4l-5 6-5-6h2z" fill="white" />
    <path d="M27 25c0 4.4-3.6 8-8 8v-4c2.2 0 4-1.8 4-4h-4l5-6 5 6h-2z" fill="white" />
    <text x="42" y="32" fontSize="18" fontWeight="700" fill="currentColor" fontFamily="system-ui, sans-serif">ChangeNOW</text>
  </svg>
);

const SunSwapLogo = () => (
  <svg viewBox="0 0 180 50" className="h-6 w-auto" fill="currentColor">
    <circle cx="20" cy="25" r="12" fill="#f59e0b" />
    <circle cx="20" cy="25" r="6" fill="#fbbf24" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
      <line
        key={i}
        x1={20 + 14 * Math.cos((angle * Math.PI) / 180)}
        y1={25 + 14 * Math.sin((angle * Math.PI) / 180)}
        x2={20 + 18 * Math.cos((angle * Math.PI) / 180)}
        y2={25 + 18 * Math.sin((angle * Math.PI) / 180)}
        stroke="#f59e0b"
        strokeWidth="2"
        strokeLinecap="round"
      />
    ))}
    <text x="44" y="32" fontSize="18" fontWeight="700" fill="currentColor" fontFamily="system-ui, sans-serif">SunSwap</text>
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
          {[...Array(3)].map((_, setIndex) =>
            partners.map((partner, index) => (
              <div
                key={`${setIndex}-${index}`}
                className="flex items-center justify-center mx-10 min-w-[140px] h-10 text-white opacity-70 hover:opacity-100 transition-opacity"
              >
                <partner.Logo />
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
