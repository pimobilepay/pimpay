"use client";

import { useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { toPng } from "html-to-image";
import { Download, FileText, Loader2, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AgentBadgeProps {
  name: string;
  code: string;
  role?: string | null;
  avatar?: string | null;
  qrValue: string;
}

export function AgentBadge({ name, code, role, avatar, qrValue }: AgentBadgeProps) {
  const badgeRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState<"png" | "pdf" | null>(null);

  const initials = (name || "AG")
    .split(" ")
    .map((p) => p.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const capture = async () => {
    if (!badgeRef.current) return null;
    return toPng(badgeRef.current, {
      cacheBust: true,
      pixelRatio: 3,
      backgroundColor: "#02040a",
    });
  };

  const handleDownloadPng = async () => {
    try {
      setDownloading("png");
      const dataUrl = await capture();
      if (!dataUrl) return;
      const link = document.createElement("a");
      link.download = `badge-agent-${code}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error("[AgentBadge] PNG export failed", e);
    } finally {
      setDownloading(null);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloading("pdf");
      const dataUrl = await capture();
      if (!dataUrl) return;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = 90;
      const imgHeight = 130;
      const x = (pageWidth - imgWidth) / 2;
      pdf.setFillColor(2, 4, 10);
      pdf.rect(0, 0, pageWidth, pdf.internal.pageSize.getHeight(), "F");
      pdf.addImage(dataUrl, "PNG", x, 30, imgWidth, imgHeight);
      pdf.save(`badge-agent-${code}.pdf`);
    } catch (e) {
      console.error("[AgentBadge] PDF export failed", e);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Badge Card (captured) */}
      <div
        ref={badgeRef}
        className="w-[280px] rounded-[2rem] border border-emerald-500/30 bg-gradient-to-b from-slate-900 to-[#02040a] p-6 shadow-2xl shadow-emerald-500/10"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600">
              <Wallet className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-black text-white leading-none">PIMOBIPAY</p>
              <p className="text-[8px] font-bold uppercase tracking-widest text-emerald-500">Agent Officiel</p>
            </div>
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-500" />
        </div>

        <div className="mt-6 flex flex-col items-center">
          <div className="h-20 w-20 overflow-hidden rounded-2xl border-2 border-emerald-500/40 bg-slate-800">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar || "/placeholder.svg"} alt={name} className="h-full w-full object-cover" crossOrigin="anonymous" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-2xl font-black text-emerald-500">
                {initials}
              </div>
            )}
          </div>
          <p className="mt-3 text-center text-base font-black text-white text-balance">{name}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500/80">
            {role === "SUPERVISOR" ? "Superviseur" : "Agent Partenaire"}
          </p>
        </div>

        <div className="mt-5 flex justify-center rounded-2xl bg-white p-3">
          <QRCodeSVG value={qrValue} size={140} level="H" includeMargin={false} />
        </div>

        <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-center">
          <p className="text-[8px] font-black uppercase tracking-[3px] text-slate-500">Code Agent</p>
          <p className="mt-0.5 font-mono text-sm font-black text-emerald-400 break-all">{code}</p>
        </div>
      </div>

      {/* Export buttons */}
      <div className="grid w-[280px] grid-cols-2 gap-3">
        <Button
          onClick={handleDownloadPng}
          disabled={downloading !== null}
          className="bg-emerald-600 hover:bg-emerald-700 text-white"
        >
          {downloading === "png" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          PNG
        </Button>
        <Button
          onClick={handleDownloadPdf}
          disabled={downloading !== null}
          variant="outline"
          className="border-white/10 bg-slate-900/50 text-white hover:bg-slate-800"
        >
          {downloading === "pdf" ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileText className="h-4 w-4 mr-2" />
          )}
          PDF
        </Button>
      </div>
    </div>
  );
}
