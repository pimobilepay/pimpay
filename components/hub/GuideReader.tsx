import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, ExternalLink, Lightbulb } from "lucide-react";
import { GUIDE_REFERENCES, type GuideSection } from "@/lib/agent-guide";

function isExternal(href: string) {
  return !href.startsWith("/");
}

export function GuideReader({ sections }: { sections: GuideSection[] }) {
  return (
    <div className="mt-2 flex flex-col gap-8">
      <nav aria-label="Sommaire du guide" className="rounded-2xl border border-white/10 bg-slate-800/40 p-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Sommaire</p>
        <ol className="flex flex-col gap-1.5">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a href={`#guide-${s.id}`} className="text-sm text-slate-300 hover:text-emerald-400">
                {i + 1}. {s.title}
              </a>
            </li>
          ))}
          <li>
            <a href="#guide-references" className="text-sm text-slate-300 hover:text-emerald-400">
              {sections.length + 1}. Références et liens utiles
            </a>
          </li>
        </ol>
      </nav>

      {sections.map((section, index) => (
        <section key={section.id} id={`guide-${section.id}`} className="scroll-mt-4">
          <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
            Chapitre {index + 1}
          </p>
          <h3 className="mt-1 text-lg font-black text-white">{section.title}</h3>
          <p className="mt-1 text-sm text-slate-400">{section.summary}</p>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <ol className="flex flex-1 flex-col gap-3">
              {section.steps.map((step, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
            {section.image && (
              <figure className="mx-auto w-40 shrink-0 sm:w-44">
                <Image
                  src={section.image.src}
                  alt={section.image.caption}
                  width={352}
                  height={528}
                  className="h-auto w-full rounded-xl border border-white/10"
                />
                <figcaption className="mt-1.5 text-center text-[11px] text-slate-500">
                  {section.image.caption}
                </figcaption>
              </figure>
            )}
          </div>

          {section.notes?.map((note, i) => {
            const warning = note.type === "warning";
            const Icon = warning ? AlertTriangle : Lightbulb;
            return (
              <div
                key={i}
                className={`mt-4 flex gap-3 rounded-xl border p-3 text-sm ${
                  warning
                    ? "border-red-500/30 bg-red-500/10 text-red-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-100"
                }`}
              >
                <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${warning ? "text-red-400" : "text-amber-400"}`} />
                <p>{note.text}</p>
              </div>
            );
          })}

          {section.links?.length ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {section.links.map((link) => (
                <Link
                  key={link.href + link.label}
                  href={link.href}
                  className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      ))}

      <section id="guide-references" className="scroll-mt-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-500">
          Chapitre {sections.length + 1}
        </p>
        <h3 className="mt-1 text-lg font-black text-white">Références et liens utiles</h3>
        <ul className="mt-3 flex flex-col divide-y divide-white/5 rounded-2xl border border-white/10">
          {GUIDE_REFERENCES.map((ref) => (
            <li key={ref.href}>
              <a
                href={ref.href}
                target={isExternal(ref.href) ? "_blank" : undefined}
                rel={isExternal(ref.href) ? "noopener noreferrer" : undefined}
                className="flex items-center gap-3 p-3 hover:bg-white/5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{ref.label}</p>
                  <p className="text-xs text-slate-400">{ref.description}</p>
                </div>
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-500" />
              </a>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
