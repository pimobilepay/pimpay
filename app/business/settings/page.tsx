"use client";

import { useState } from "react";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
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
  User,
  Bell,
  Shield,
  CreditCard,
  Globe,
  Key,
  Smartphone,
  Mail,
  Menu,
  X,
  Upload,
  Save,
  Eye,
  EyeOff,
  BadgeCheck,
  AlertTriangle,
  Lock,
  Fingerprint,
  History,
  LogOut,
  Trash2,
  Link,
  FileText,
} from "lucide-react";

// Security sessions
const activeSessions = [
  { id: 1, device: "MacBook Pro - Chrome", location: "Kinshasa, RDC", lastActive: "Actuellement actif", current: true },
  { id: 2, device: "iPhone 14 - Safari", location: "Kinshasa, RDC", lastActive: "Il y a 2 heures", current: false },
  { id: 3, device: "Windows PC - Firefox", location: "Lubumbashi, RDC", lastActive: "Il y a 3 jours", current: false },
];

// Connected services
const connectedServices = [
  { id: 1, name: "Google Workspace", status: "connected", icon: "G" },
  { id: 2, name: "Microsoft 365", status: "connected", icon: "M" },
  { id: 3, name: "Slack", status: "disconnected", icon: "S" },
  { id: 4, name: "QuickBooks", status: "connected", icon: "Q" },
];

export default function SettingsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [transactionAlerts, setTransactionAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Security settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

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
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Parametres</h1>
            <p className="text-sm text-slate-500 mt-1">Gerez les parametres de votre compte entreprise</p>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="flex flex-wrap gap-2 bg-transparent h-auto p-0 mb-8">
            {[
              { value: "profile", label: "Profil", icon: User },
              { value: "security", label: "Securite", icon: Shield },
              { value: "notifications", label: "Notifications", icon: Bell },
              { value: "billing", label: "Facturation", icon: CreditCard },
              { value: "integrations", label: "Integrations", icon: Link },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="px-4 py-2.5 rounded-xl bg-slate-900/50 border border-white/5 text-slate-400 text-xs font-bold data-[state=active]:bg-emerald-500/10 data-[state=active]:border-emerald-500/30 data-[state=active]:text-emerald-500"
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile" className="space-y-6">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Informations de l&apos;Entreprise</CardTitle>
                <CardDescription className="text-slate-500">Mettez a jour les informations de votre entreprise</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl font-black text-emerald-500">
                    EP
                  </div>
                  <div>
                    <Button variant="outline" className="border-white/10 text-xs font-bold mb-2">
                      <Upload className="h-4 w-4 mr-2" />
                      Changer le logo
                    </Button>
                    <p className="text-xs text-slate-500">JPG, PNG ou SVG. Max 2MB.</p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Nom de l&apos;entreprise</Label>
                    <Input defaultValue="Entreprise Pro SARL" className="bg-slate-800/50 border-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Numero RCCM</Label>
                    <Input defaultValue="CD/KIN/RCCM/24-A-12345" className="bg-slate-800/50 border-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Email professionnel</Label>
                    <Input defaultValue="contact@entreprisepro.cd" className="bg-slate-800/50 border-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Telephone</Label>
                    <Input defaultValue="+243 812 345 678" className="bg-slate-800/50 border-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-300 text-sm font-bold">Adresse</Label>
                    <Textarea defaultValue="123 Avenue de la Paix, Gombe, Kinshasa, RDC" className="bg-slate-800/50 border-white/10 rounded-xl resize-none" rows={2} />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Secteur d&apos;activite</Label>
                    <Select defaultValue="tech">
                      <SelectTrigger className="bg-slate-800/50 border-white/10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="tech">Technologie</SelectItem>
                        <SelectItem value="finance">Finance</SelectItem>
                        <SelectItem value="commerce">Commerce</SelectItem>
                        <SelectItem value="services">Services</SelectItem>
                        <SelectItem value="industrie">Industrie</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Taille de l&apos;entreprise</Label>
                    <Select defaultValue="10-50">
                      <SelectTrigger className="bg-slate-800/50 border-white/10 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="1-10">1-10 employes</SelectItem>
                        <SelectItem value="10-50">10-50 employes</SelectItem>
                        <SelectItem value="50-200">50-200 employes</SelectItem>
                        <SelectItem value="200+">200+ employes</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button className="bg-emerald-500 hover:bg-emerald-600 font-bold">
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer les modifications
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Account Status */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Statut du Compte</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/20 rounded-xl">
                      <BadgeCheck className="h-6 w-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Compte Verifie</p>
                      <p className="text-xs text-slate-400">Votre entreprise a ete verifiee avec succes</p>
                    </div>
                  </div>
                  <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 font-bold">
                    Business Pro
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Tab */}
          <TabsContent value="security" className="space-y-6">
            {/* Password */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Mot de Passe</CardTitle>
                <CardDescription className="text-slate-500">Changez votre mot de passe</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-slate-300 text-sm font-bold">Mot de passe actuel</Label>
                  <div className="relative">
                    <Input type={showPassword ? "text" : "password"} className="bg-slate-800/50 border-white/10 rounded-xl pr-10" />
                    <button
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Nouveau mot de passe</Label>
                    <Input type="password" className="bg-slate-800/50 border-white/10 rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Confirmer le mot de passe</Label>
                    <Input type="password" className="bg-slate-800/50 border-white/10 rounded-xl" />
                  </div>
                </div>
                <Button className="bg-emerald-500 hover:bg-emerald-600 font-bold">
                  <Key className="h-4 w-4 mr-2" />
                  Mettre a jour le mot de passe
                </Button>
              </CardContent>
            </Card>

            {/* Two-Factor Auth */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Authentification a Deux Facteurs</CardTitle>
                <CardDescription className="text-slate-500">Ajoutez une couche de securite supplementaire</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                      <Smartphone className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Application d&apos;authentification</p>
                      <p className="text-xs text-slate-500">Google Authenticator, Authy, etc.</p>
                    </div>
                  </div>
                  <Switch checked={twoFactorEnabled} onCheckedChange={setTwoFactorEnabled} />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-500/10 rounded-xl">
                      <Fingerprint className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Authentification biometrique</p>
                      <p className="text-xs text-slate-500">Face ID, Touch ID, empreinte</p>
                    </div>
                  </div>
                  <Switch checked={biometricEnabled} onCheckedChange={setBiometricEnabled} />
                </div>
              </CardContent>
            </Card>

            {/* Active Sessions */}
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Sessions Actives</CardTitle>
                    <CardDescription className="text-slate-500">Gerez vos connexions actives</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold">
                    <LogOut className="h-4 w-4 mr-2" />
                    Deconnecter tout
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {activeSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-xl ${session.current ? "bg-emerald-500/10" : "bg-slate-700"}`}>
                        <Globe className={`h-5 w-5 ${session.current ? "text-emerald-500" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-white">{session.device}</p>
                          {session.current && (
                            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">
                              Actuel
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{session.location} - {session.lastActive}</p>
                      </div>
                    </div>
                    {!session.current && (
                      <Button variant="ghost" size="sm" className="text-red-500 hover:bg-red-500/10 text-xs font-bold">
                        Revoquer
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Tab */}
          <TabsContent value="notifications" className="space-y-6">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Preferences de Notification</CardTitle>
                <CardDescription className="text-slate-500">Choisissez comment recevoir vos notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Notifications par email", description: "Recevez les mises a jour par email", state: emailNotifications, setState: setEmailNotifications, icon: Mail },
                  { label: "Notifications push", description: "Notifications sur votre appareil", state: pushNotifications, setState: setPushNotifications, icon: Bell },
                  { label: "Notifications SMS", description: "Alertes critiques par SMS", state: smsNotifications, setState: setSmsNotifications, icon: Smartphone },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-slate-700 rounded-xl">
                        <item.icon className="h-5 w-5 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{item.label}</p>
                        <p className="text-xs text-slate-500">{item.description}</p>
                      </div>
                    </div>
                    <Switch checked={item.state} onCheckedChange={item.setState} />
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Types d&apos;Alertes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {[
                  { label: "Alertes de transaction", description: "Chaque transaction effectuee", state: transactionAlerts, setState: setTransactionAlerts },
                  { label: "Alertes de securite", description: "Connexions suspectes, changements de mot de passe", state: securityAlerts, setState: setSecurityAlerts },
                  { label: "Emails marketing", description: "Offres et promotions PimPay", state: marketingEmails, setState: setMarketingEmails },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                    <div>
                      <p className="text-sm font-bold text-white">{item.label}</p>
                      <p className="text-xs text-slate-500">{item.description}</p>
                    </div>
                    <Switch checked={item.state} onCheckedChange={item.setState} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Plan Actuel</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="p-6 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border border-emerald-500/30">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Badge className="bg-emerald-500 text-white font-bold mb-2">Business Pro</Badge>
                      <p className="text-2xl font-black text-white">$99/mois</p>
                    </div>
                    <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 font-bold">
                      Changer de plan
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-xl font-black text-white">Illimite</p>
                      <p className="text-xs text-slate-300">Transactions</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-white">50</p>
                      <p className="text-xs text-slate-300">Employes</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-white">0.5%</p>
                      <p className="text-xs text-slate-300">Frais</p>
                    </div>
                    <div>
                      <p className="text-xl font-black text-white">24/7</p>
                      <p className="text-xs text-slate-300">Support</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-black text-white">Historique des Factures</CardTitle>
                    <CardDescription className="text-slate-500">Vos dernieres factures</CardDescription>
                  </div>
                  <Button variant="outline" className="border-white/10 text-xs font-bold">
                    Voir tout
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { date: "01 Mar 2026", amount: 99, status: "paid" },
                  { date: "01 Fev 2026", amount: 99, status: "paid" },
                  { date: "01 Jan 2026", amount: 99, status: "paid" },
                ].map((invoice, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-slate-700 rounded-xl">
                        <FileText className="h-5 w-5 text-slate-300" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Facture - {invoice.date}</p>
                        <p className="text-xs text-slate-500">Plan Business Pro</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-sm font-black text-white">${invoice.amount}</p>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] font-bold">
                        Paye
                      </Badge>
                      <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white">
                        <History className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Integrations Tab */}
          <TabsContent value="integrations" className="space-y-6">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Services Connectes</CardTitle>
                <CardDescription className="text-slate-500">Gerez vos integrations tierces</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {connectedServices.map((service) => (
                  <div key={service.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-700 flex items-center justify-center text-sm font-black text-white">
                        {service.icon}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">{service.name}</p>
                        <p className="text-xs text-slate-500">
                          {service.status === "connected" ? "Connecte" : "Non connecte"}
                        </p>
                      </div>
                    </div>
                    {service.status === "connected" ? (
                      <Button variant="outline" size="sm" className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold">
                        Deconnecter
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 text-xs font-bold">
                        Connecter
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="bg-slate-900/50 border-red-500/20 rounded-3xl">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <CardTitle className="text-lg font-black text-red-500">Zone Dangereuse</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm font-bold text-white mb-2">Supprimer le compte entreprise</p>
                  <p className="text-xs text-slate-400 mb-4">
                    Cette action est irreversible. Toutes vos donnees seront definitivement supprimees.
                  </p>
                  <Button variant="outline" className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer le compte
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
