"use client";

const VisaLogo = () => (
  <svg viewBox="0 0 256 83" className="h-8 w-auto" fill="white">
    <path d="M132.397 56.24c-.146-11.516 10.263-17.942 18.104-21.763 8.024-3.9 10.724-6.4 10.69-9.887-.066-5.332-6.396-7.686-12.322-7.78-10.373-.166-16.393 2.81-21.198 5.05l-3.74-17.478C129.59 1.75 138.04 0 146.744 0c24.892 0 41.17 12.286 41.276 31.33.117 24.192-33.472 25.55-33.232 36.36.085 3.282 3.207 6.78 10.065 7.67 3.397.45 12.77.79 23.39-4.09l4.17 19.44c-5.717 2.08-13.06 4.08-22.206 4.08-23.448 0-39.938-12.476-40.014-30.32zm101.74-38.7h-18.175c-5.68 0-10.44 3.28-12.556 8.36L168.47 76.27h23.32l4.632-12.82h28.497l2.69 12.82h20.534L228.138 17.54zm-21.01 43.83c1.94-5.23 9.348-25.35 9.348-25.35-.14.244 1.92-5.25 3.104-8.66l1.585 7.82s4.487 21.67 5.431 26.19zm-131.426-43.83L64.278 76.27H41.6L26.49 27.19c-.92-3.6-1.71-4.92-4.5-6.44C17.34 17.94 10.25 15.52 4 13.82l.448-3.04h34.76c4.43 0 8.42 2.95 9.43 8.05l8.6 45.68 21.26-53.69z"/>
  </svg>
);

const SimpleSwapLogo = () => (
  <svg viewBox="0 0 220 50" className="h-10 w-auto" fill="none">
    <circle cx="25" cy="25" r="20" fill="#3b82f6"/>
    <path d="M17 21h12M29 21l-4-4M29 21l-4 4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M33 29H21M21 29l4 4M21 29l4-4" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="52" y="33" fontSize="20" fontWeight="800" fill="white" fontFamily="system-ui, -apple-system, sans-serif">SimpleSwap</text>
  </svg>
);

const ChangeNowLogo = () => (
  <svg viewBox="0 0 220 50" className="h-10 w-auto" fill="none">
    <circle cx="25" cy="25" r="20" fill="#10b981"/>
    <path d="M18 25a7 7 0 0114 0" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M32 22l-1 4-4-1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M32 25a7 7 0 01-14 0" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
    <path d="M18 28l1-4 4 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    <text x="52" y="33" fontSize="20" fontWeight="800" fill="white" fontFamily="system-ui, -apple-system, sans-serif">ChangeNOW</text>
  </svg>
);

const SunSwapLogo = () => (
  <svg viewBox="0 0 200 50" className="h-10 w-auto" fill="none">
    <circle cx="25" cy="25" r="12" fill="#f59e0b"/>
    <circle cx="25" cy="25" r="6" fill="#fbbf24"/>
    <g stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
      <line x1="25" y1="5" x2="25" y2="9"/>
      <line x1="25" y1="41" x2="25" y2="45"/>
      <line x1="5" y1="25" x2="9" y2="25"/>
      <line x1="41" y1="25" x2="45" y2="25"/>
      <line x1="10.86" y1="10.86" x2="13.69" y2="13.69"/>
      <line x1="36.31" y1="36.31" x2="39.14" y2="39.14"/>
      <line x1="10.86" y1="39.14" x2="13.69" y2="36.31"/>
      <line x1="36.31" y1="13.69" x2="39.14" y2="10.86"/>
    </g>
    <text x="52" y="33" fontSize="20" fontWeight="800" fill="white" fontFamily="system-ui, -apple-system, sans-serif">SunSwap</text>
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
                className="flex items-center justify-center mx-8 min-w-[180px] h-12 opacity-80 hover:opacity-100 transition-opacity"
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
