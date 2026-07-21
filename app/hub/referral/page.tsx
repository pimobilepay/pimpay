"use client";

import { useState } from "react";
import useSWR from "swr";
import { QRCodeSVG } from "qrcode.react";
import { HubShell } from "@/components/hub/HubShell";
import { AgentProfileCard } from "@/components/hub/AgentProfileCard";
import { AgentIdBadge } from "@/components/hub/AgentIdBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Copy,
  Check,
  Share2,
  MessageCircle,
  Users,
  UserCheck,
  Clock,
  QrCode,
  Link2,
  BadgeCheck,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AgentReferralPage() {
  const { data, isLoading } = useSWR("/api/agent/referral", fetcher);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const agent = data?.agent;
  const stats = data?.stats || { totalReferred: 0, activatedCount: 0, pendingKyc: 0 };
  const code = agent?.referralCode || "";
  const referralLink = data?.referralLink || "";
  const qrValue = referralLink || code;

  const joinDate = agent?.createdAt
    ? new Date(agent.createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—";

  const shareText = `Rejoignez PIMOBIPAY avec mon code agent ${code} et commencez a envoyer/recevoir de l'argent facilement ! Inscription : ${referralLink}`;

  const copy = (value: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(value);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: "Parrainage PIMOBIPAY", text: shareText, url: referralLink });
      } catch {
        /* annulé */
      }
    } else {
      copy(shareText, setCopiedLink);
    }
  };

  const shareWhatsApp = () =>
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  const shareSms = () => {
    window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
  };

  return (
    <HubShell
      title="Parrainage & QR"
      description="Partagez votre code, recrutez des clients et suivez vos filleuls"
    >
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
              <Users className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Filleuls</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-12 bg-slate-700" />
            ) : (
              <p className="text-2xl font-black text-white">{stats.totalReferred}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-emerald-500 mb-2">
              <UserCheck className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Actifs</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-12 bg-slate-700" />
            ) : (
              <p className="text-2xl font-black text-emerald-500">{stats.activatedCount}</p>
            )}
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-amber-500 mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-wider">KYC</span>
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-12 bg-slate-700" />
            ) : (
              <p className="text-2xl font-black text-amber-500">{stats.pendingKyc}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QR + Code + Share */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <QrCode className="h-5 w-5 text-emerald-500" />
              Mon QR Code Agent
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* QR */}
            <div className="flex justify-center">
              {isLoading ? (
                <Skeleton className="h-[200px] w-[200px] rounded-3xl bg-slate-700" />
              ) : (
                <div className="rounded-3xl bg-white p-4 shadow-2xl shadow-emerald-500/10">
                  <QRCodeSVG value={qrValue} size={200} level="H" includeMargin={false} />
                </div>
              )}
            </div>

            {/* Code Agent */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-500 mb-2">
                Code Agent / Parrain
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="font-mono text-lg font-black text-emerald-400 break-all">
                    {isLoading ? "..." : code}
                  </p>
                </div>
                <Button
                  onClick={() => copy(code, setCopiedCode)}
                  size="icon"
                  className="h-12 w-12 shrink-0 bg-emerald-600 hover:bg-emerald-700"
                  aria-label="Copier le code"
                >
                  {copiedCode ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Referral link */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-500 mb-2">
                Lien de parrainage
              </p>
              <button
                onClick={() => copy(referralLink, setCopiedLink)}
                className="flex w-full items-center gap-2 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-emerald-500/30"
              >
                <Link2 className="h-4 w-4 shrink-0 text-slate-500" />
                <span className="flex-1 truncate text-sm text-slate-300">{referralLink || "..."}</span>
                {copiedLink ? (
                  <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Copy className="h-4 w-4 shrink-0 text-slate-500" />
                )}
              </button>
            </div>

            {/* Share buttons */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-[3px] text-slate-500 mb-2">
                Partager mon lien
              </p>
              <div className="grid grid-cols-3 gap-3">
                <Button
                  onClick={shareWhatsApp}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  WhatsApp
                </Button>
                <Button
                  onClick={shareSms}
                  variant="outline"
                  className="border-white/10 bg-slate-900/50 text-white hover:bg-slate-800"
                >
                  <MessageCircle className="h-4 w-4 mr-1.5" />
                  SMS
                </Button>
                <Button
                  onClick={handleNativeShare}
                  variant="outline"
                  className="border-white/10 bg-slate-900/50 text-white hover:bg-slate-800"
                >
                  <Share2 className="h-4 w-4 mr-1.5" />
                  Plus
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Badge */}
        <Card className="bg-slate-900/50 border-white/5 rounded-3xl lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-black text-white flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-emerald-500" />
              Mon Badge Virtuel
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading || !agent ? (
              <div className="flex justify-center gap-4">
                <Skeleton className="h-[560px] w-[300px] rounded-[2rem] bg-slate-700" />
                <Skeleton className="hidden h-[560px] w-[300px] rounded-[2rem] bg-slate-700 sm:block" />
              </div>
            ) : (
              <AgentIdBadge
                name={agent.name}
                code={code}
                avatar={agent.avatar}
                qrValue={qrValue}
                phone={agent.phone}
                email={agent.email}
                joinDate={joinDate}
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Full official profile card */}
      <div className="mt-6">
        <CardTitle className="mb-4 flex items-center justify-center gap-2 text-lg font-black text-white">
          <BadgeCheck className="h-5 w-5 text-emerald-500" />
          Ma Carte Agent Officiel
        </CardTitle>
        {isLoading || !agent ? (
          <div className="flex justify-center">
            <Skeleton className="h-[900px] w-full max-w-[520px] rounded-[2rem] bg-slate-700" />
          </div>
        ) : (
          <div className="flex justify-center">
            <AgentProfileCard
              name={agent.name}
              code={code}
              role={agent.agentRole}
              avatar={agent.avatar}
              qrValue={qrValue}
              referralLink={referralLink}
              phone={agent.phone}
            />
          </div>
        )}
      </div>
    </HubShell>
  );
}
