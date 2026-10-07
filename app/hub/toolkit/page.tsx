"use client";

import { useState } from "react";
import { HubShell } from "@/components/hub/HubShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GUIDE_SECTIONS } from "@/lib/agent-guide";
import { GuideReader } from "@/components/hub/GuideReader";
import {
  BookOpen,
  Download,
  FileText,
  ImageIcon,
  MessageCircle,
  Send,
  Loader2,
  ChevronRight,
  ShieldCheck,
  Eye,
} from "lucide-react";

const FLYERS = [
  { id: "flyer-1", title: "Affiche Point Agent", format: "A4 - PNG" },
  { id: "flyer-2", title: "Flyer Depot & Retrait", format: "A5 - PNG" },
  { id: "flyer-3", title: "Banniere Reseaux Sociaux", format: "1080x1080" },
  { id: "flyer-4", title: "Grille Tarifaire", format: "A4 - PNG" },
];

export default function AgentToolkitPage() {
  const [guideOpen, setGuideOpen] = useState(false);
  const [downloadingGuide, setDownloadingGuide] = useState(false);

  const handleDownloadGuide = async () => {
    try {
      setDownloadingGuide(true);
      const { buildAgentGuidePdf, browserImageLoader } = await import("@/lib/agent-guide-pdf");
      const pdf = await buildAgentGuidePdf({
        origin: window.location.origin,
        loadImage: browserImageLoader,
      });
      pdf.save("guide-demarrage-rapide-agent-pimobipay.pdf");
    } catch (e) {
      console.error("[Toolkit] Guide PDF failed", e);
    } finally {
      setDownloadingGuide(false);
    }
  };

  const handleDownloadFlyer = (id: string, title: string) => {
    const link = document.createElement("a");
    link.href = `/placeholder.svg?height=600&width=480&query=${encodeURIComponent(title + " PIMOBIPAY brand flyer")}`;
    link.download = `${id}.svg`;
    link.target = "_blank";
    link.click();
  };

  return (
    <HubShell
      title="Kit Terrain"
      description="Ressources, guides et support pour reussir sur le terrain"
    >
      {/* Guide + Support */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Quick Start Guide */}
        <Card className="bg-gradient-to-br from-emerald-500/15 to-teal-600/10 border-emerald-500/20 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-500" />
              Guide de Demarrage Rapide
            </CardTitle>
            <CardDescription className="text-slate-400">
              Manuel complet avec captures d&apos;écran : accueil client, dépôts, retraits, Float, sécurité, FAQ et liens de référence.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setGuideOpen(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Eye className="h-4 w-4 mr-2" />
              Lire dans l&apos;app
            </Button>
            <Button
              onClick={handleDownloadGuide}
              disabled={downloadingGuide}
              variant="outline"
              className="flex-1 border-white/10 bg-slate-900/50 text-white hover:bg-slate-800"
            >
              {downloadingGuide ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Telecharger PDF
            </Button>
          </CardContent>
        </Card>

        {/* Support Direct */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-blue-500" />
              Support Direct Agent
            </CardTitle>
            <CardDescription className="text-slate-400">
              Rejoignez les groupes VIP pour une assistance immediate.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <button
              onClick={() => window.open("https://wa.me/242065540305", "_blank")}
              className="flex w-full items-center gap-3 rounded-2xl bg-green-500/10 border border-green-500/20 p-4 transition-colors hover:bg-green-500/20"
            >
              <div className="p-2.5 rounded-xl bg-green-500/20">
                <MessageCircle className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-white">Groupe VIP WhatsApp</p>
                <p className="text-xs text-slate-400">Assistance agents 24/7</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </button>
            <button
              onClick={() => window.open("https://t.me/pimobipay", "_blank")}
              className="flex w-full items-center gap-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 p-4 transition-colors hover:bg-blue-500/20"
            >
              <div className="p-2.5 rounded-xl bg-blue-500/20">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-bold text-white">Canal Telegram Agents</p>
                <p className="text-xs text-slate-400">Annonces & mises a jour</p>
              </div>
              <ChevronRight className="h-5 w-5 text-slate-500" />
            </button>
          </CardContent>
        </Card>
      </div>

      {/* Visuals & Flyers */}
      <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
        <CardHeader>
          <CardTitle className="text-lg font-black text-white flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-amber-500" />
            Visuels & Flyers Officiels
          </CardTitle>
          <CardDescription className="text-slate-400">
            Telechargez les visuels de la marque pour vos points de vente et reseaux sociaux.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {FLYERS.map((flyer) => (
              <div
                key={flyer.id}
                className="group rounded-2xl border border-white/5 bg-slate-800/40 overflow-hidden"
              >
                <div className="aspect-[4/5] overflow-hidden bg-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/placeholder.svg?height=500&width=400&query=${encodeURIComponent(flyer.title + " PIMOBIPAY green neon brand flyer")}`}
                    alt={flyer.title}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                  />
                </div>
                <div className="p-3">
                  <p className="text-sm font-bold text-white truncate">{flyer.title}</p>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-2">{flyer.format}</p>
                  <Button
                    onClick={() => handleDownloadFlyer(flyer.id, flyer.title)}
                    size="sm"
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Download className="h-3.5 w-3.5 mr-1.5" />
                    Telecharger
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* In-app Guide Reader */}
      <Dialog open={guideOpen} onOpenChange={setGuideOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-emerald-500" />
              Guide de Demarrage Rapide
            </DialogTitle>
            <DialogDescription className="text-slate-400">
              Tout ce qu&apos;il faut savoir pour operer sur le terrain.
            </DialogDescription>
          </DialogHeader>
          <GuideReader sections={GUIDE_SECTIONS} />
          <Button
            onClick={handleDownloadGuide}
            disabled={downloadingGuide}
            className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {downloadingGuide ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            Telecharger en PDF
          </Button>
        </DialogContent>
      </Dialog>
    </HubShell>
  );
}
