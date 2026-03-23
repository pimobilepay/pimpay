"use client";

import { useState } from "react";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Building2,
  Send,
  Users,
  Building,
  Wallet,
  CreditCard,
  QrCode,
  Phone,
  User,
  Clock,
  CheckCircle2,
  Menu,
  X,
  ArrowRight,
  Plus,
  Star,
  History,
  Zap,
  Globe,
} from "lucide-react";

// Frequent recipients
const frequentRecipients = [
  { id: 1, name: "Fournisseur Alpha SARL", type: "Entreprise", account: "****4521", lastPayment: "23 Mar 2026" },
  { id: 2, name: "Jean-Pierre Mbote", type: "Employe", account: "****8745", lastPayment: "22 Mar 2026" },
  { id: 3, name: "Services Cloud AWS", type: "Fournisseur", account: "****1234", lastPayment: "16 Mar 2026" },
  { id: 4, name: "Location Bureaux SCI", type: "Loyer", account: "****9876", lastPayment: "20 Mar 2026" },
];

// Payment templates
const paymentTemplates = [
  { id: 1, name: "Paiement Salaires", amount: 23300, recipients: 8, frequency: "Mensuel" },
  { id: 2, name: "Loyer Bureaux", amount: 5000, recipients: 1, frequency: "Mensuel" },
  { id: 3, name: "Abonnements Cloud", amount: 1250, recipients: 1, frequency: "Mensuel" },
];

// Recent payments
const recentPayments = [
  { id: 1, recipient: "Fournisseur Alpha SARL", amount: 15000, date: "23 Mar 2026", status: "completed" },
  { id: 2, recipient: "Employes - Mars 2026", amount: 23300, date: "22 Mar 2026", status: "completed" },
  { id: 3, recipient: "Prime Trimestrielle", amount: 8500, date: "18 Mar 2026", status: "pending" },
  { id: 4, recipient: "Equipements IT Pro", amount: 7800, date: "17 Mar 2026", status: "failed" },
];

export default function PaymentsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("virement");
  const [amount, setAmount] = useState("");
  const [recipient, setRecipient] = useState("");
  const [description, setDescription] = useState("");

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <BusinessSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-black text-white">PIMPAY</h1>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase">Business</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <BusinessSidebar isMobile />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 lg:p-8">
        {/* Mobile Header */}
        <div className="flex items-center justify-between mb-6 lg:hidden">
          <button onClick={() => setMobileMenuOpen(true)} className="p-2 rounded-xl bg-white/5 text-slate-400">
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600">
              <Building2 className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Paiements</h1>
            <p className="text-sm text-slate-500 mt-1">Effectuez des virements et paiements instantanes</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-4 bg-slate-900/50 rounded-2xl border border-white/5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Solde disponible</p>
              <p className="text-xl font-black text-white">$247,850.00</p>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Payment Form - 2 columns */}
          <div className="xl:col-span-2">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Nouveau Paiement</CardTitle>
                <CardDescription className="text-slate-500">Effectuez un virement ou paiement</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="simple" className="w-full">
                  <TabsList className="grid w-full grid-cols-3 bg-slate-800/50 rounded-2xl p-1 mb-6">
                    <TabsTrigger value="simple" className="rounded-xl text-xs font-bold data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                      Paiement Simple
                    </TabsTrigger>
                    <TabsTrigger value="groupe" className="rounded-xl text-xs font-bold data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                      Paiement Groupe
                    </TabsTrigger>
                    <TabsTrigger value="international" className="rounded-xl text-xs font-bold data-[state=active]:bg-emerald-500 data-[state=active]:text-white">
                      International
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="simple" className="space-y-6">
                    {/* Payment Method Selection */}
                    <div className="space-y-3">
                      <Label className="text-slate-300 text-sm font-bold">Methode de paiement</Label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { id: "virement", label: "Virement", icon: Building },
                          { id: "mobile", label: "Mobile Money", icon: Phone },
                          { id: "wallet", label: "Portefeuille", icon: Wallet },
                          { id: "qrcode", label: "QR Code", icon: QrCode },
                        ].map((method) => (
                          <button
                            key={method.id}
                            onClick={() => setPaymentMethod(method.id)}
                            className={`p-4 rounded-2xl border transition-all ${
                              paymentMethod === method.id
                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-500"
                                : "bg-slate-800/30 border-white/5 text-slate-400 hover:border-white/10"
                            }`}
                          >
                            <method.icon className="h-6 w-6 mx-auto mb-2" />
                            <p className="text-xs font-bold">{method.label}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Recipient */}
                    <div className="space-y-3">
                      <Label className="text-slate-300 text-sm font-bold">Destinataire</Label>
                      <div className="relative">
                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                        <Input
                          value={recipient}
                          onChange={(e) => setRecipient(e.target.value)}
                          placeholder="Nom, numero de compte ou telephone"
                          className="pl-12 h-14 bg-slate-800/50 border-white/10 text-base rounded-2xl"
                        />
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="space-y-3">
                      <Label className="text-slate-300 text-sm font-bold">Montant</Label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-black text-slate-500">$</span>
                        <Input
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.00"
                          type="number"
                          className="pl-12 h-16 bg-slate-800/50 border-white/10 text-3xl font-black rounded-2xl"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {["100", "500", "1000", "5000"].map((preset) => (
                          <Button
                            key={preset}
                            variant="outline"
                            size="sm"
                            onClick={() => setAmount(preset)}
                            className="border-white/10 text-xs font-bold"
                          >
                            ${preset}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                      <Label className="text-slate-300 text-sm font-bold">Description (optionnel)</Label>
                      <Textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Motif du paiement..."
                        className="bg-slate-800/50 border-white/10 rounded-2xl resize-none"
                        rows={3}
                      />
                    </div>

                    {/* Submit */}
                    <div className="pt-4">
                      <Button className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-base font-black rounded-2xl">
                        <Send className="h-5 w-5 mr-3" />
                        Envoyer le Paiement
                      </Button>
                      <p className="text-center text-xs text-slate-500 mt-3">
                        Les fonds seront debites immediatement de votre solde
                      </p>
                    </div>
                  </TabsContent>

                  <TabsContent value="groupe" className="space-y-6">
                    <div className="p-8 rounded-2xl bg-slate-800/30 border border-dashed border-white/10 text-center">
                      <Users className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                      <h3 className="text-lg font-bold text-white mb-2">Paiement de Groupe</h3>
                      <p className="text-sm text-slate-500 mb-4">Payez plusieurs destinataires en une seule fois</p>
                      <Button variant="outline" className="border-white/10 font-bold">
                        <Plus className="h-4 w-4 mr-2" />
                        Importer une liste CSV
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="international" className="space-y-6">
                    <div className="p-8 rounded-2xl bg-slate-800/30 border border-dashed border-white/10 text-center">
                      <Globe className="h-12 w-12 mx-auto text-slate-500 mb-4" />
                      <h3 className="text-lg font-bold text-white mb-2">Paiement International</h3>
                      <p className="text-sm text-slate-500 mb-4">Envoyez des fonds a l&apos;etranger avec des taux competitifs</p>
                      <Button className="bg-emerald-500 hover:bg-emerald-600 font-bold">
                        <Zap className="h-4 w-4 mr-2" />
                        Commencer
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Frequent Recipients */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-white">Frequents</CardTitle>
                  <Button variant="ghost" size="sm" className="text-emerald-500 text-xs font-bold">
                    Voir tout
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {frequentRecipients.map((recipient) => (
                  <button
                    key={recipient.id}
                    className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-800/30 border border-white/5 hover:border-emerald-500/30 transition-all text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center">
                        {recipient.type === "Entreprise" || recipient.type === "Fournisseur" ? (
                          <Building className="h-5 w-5 text-slate-400" />
                        ) : recipient.type === "Employe" ? (
                          <User className="h-5 w-5 text-slate-400" />
                        ) : (
                          <CreditCard className="h-5 w-5 text-slate-400" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{recipient.name}</p>
                        <p className="text-[10px] text-slate-500">{recipient.account}</p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-500" />
                  </button>
                ))}
                <Button variant="outline" className="w-full border-dashed border-white/10 text-xs font-bold">
                  <Plus className="h-4 w-4 mr-2" />
                  Ajouter un destinataire
                </Button>
              </CardContent>
            </Card>

            {/* Payment Templates */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-white">Modeles</CardTitle>
                  <Star className="h-5 w-5 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {paymentTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="p-4 rounded-2xl bg-slate-800/30 border border-white/5"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-white">{template.name}</p>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">
                        {template.frequency}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">{template.recipients} destinataire(s)</span>
                      <span className="text-sm font-black text-white">${template.amount.toLocaleString()}</span>
                    </div>
                    <Button size="sm" className="w-full mt-3 bg-slate-800 hover:bg-slate-700 text-xs font-bold">
                      <Zap className="h-3 w-3 mr-2" />
                      Executer
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Recent Payments */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-black text-white">Recents</CardTitle>
                  <History className="h-5 w-5 text-slate-500" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${
                        payment.status === "completed" ? "bg-emerald-500/10" :
                        payment.status === "pending" ? "bg-amber-500/10" : "bg-red-500/10"
                      }`}>
                        {payment.status === "completed" ? (
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ) : payment.status === "pending" ? (
                          <Clock className="h-4 w-4 text-amber-500" />
                        ) : (
                          <X className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white">{payment.recipient}</p>
                        <p className="text-[10px] text-slate-500">{payment.date}</p>
                      </div>
                    </div>
                    <p className="text-sm font-black text-white">${payment.amount.toLocaleString()}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
