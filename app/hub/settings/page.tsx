"use client";

import { useState } from "react";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Settings,
  User,
  Shield,
  Bell,
  Smartphone,
  Lock,
  Eye,
  EyeOff,
  Save,
  Menu,
  X,
  BadgeCheck,
  MapPin,
  Building,
  Phone,
  Mail,
} from "lucide-react";

export default function AgentSettingsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [notifications, setNotifications] = useState({
    transactions: true,
    marketing: false,
    security: true,
    reports: true,
  });

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <AgentSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center justify-center flex-1">
                <div>
                  <h1 className="text-sm font-black text-white text-center">PIMPAY</h1>
                  <p className="text-[9px] font-bold text-emerald-500 uppercase text-center">Agent Hub</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <AgentSidebar isMobile />
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
          <h1 className="text-sm font-black text-white">PIMPAY</h1>
          <div className="w-9" />
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Parametres</h1>
            <p className="text-sm text-slate-500 mt-1">Gerez votre compte et vos preferences</p>
          </div>
        </div>

        {/* Profile Card */}
        <Card className="bg-gradient-to-br from-emerald-500/20 to-teal-600/20 border-emerald-500/30 rounded-3xl mb-6">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-emerald-500/30 text-emerald-500 text-xl font-black">
                  AG
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-white">Agent Partner</h2>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                    <BadgeCheck className="h-3 w-3 mr-1" />
                    Verifie
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mt-2 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    Douala, Cameroun
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    Agent ID: AG-001234
                  </span>
                </div>
              </div>
              <Button variant="outline" className="border-white/10 text-white">
                Modifier photo
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal Information */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-500" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-slate-400">Prenom</Label>
                  <Input
                    defaultValue="Jean"
                    className="bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Nom</Label>
                  <Input
                    defaultValue="Dupont"
                    className="bg-slate-800/50 border-white/10 text-white"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  Telephone
                </Label>
                <Input
                  defaultValue="+237 6XX XXX XXX"
                  className="bg-slate-800/50 border-white/10 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Email
                </Label>
                <Input
                  defaultValue="agent@pimpay.com"
                  className="bg-slate-800/50 border-white/10 text-white"
                />
              </div>
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700">
                <Save className="h-4 w-4 mr-2" />
                Sauvegarder
              </Button>
            </CardContent>
          </Card>

          {/* Security */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                Securite
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-400">Code PIN</Label>
                <div className="relative">
                  <Input
                    type={showPin ? "text" : "password"}
                    defaultValue="****"
                    className="bg-slate-800/50 border-white/10 text-white pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button variant="outline" className="w-full border-white/10 text-white">
                <Lock className="h-4 w-4 mr-2" />
                Changer le mot de passe
              </Button>
              <Button variant="outline" className="w-full border-white/10 text-white">
                <Smartphone className="h-4 w-4 mr-2" />
                Configurer 2FA
              </Button>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card className="bg-slate-900/50 border-white/5 rounded-3xl lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg font-black text-white flex items-center gap-2">
                <Bell className="h-5 w-5 text-amber-500" />
                Notifications
              </CardTitle>
              <CardDescription className="text-slate-500">
                Gerez vos preferences de notification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50">
                  <div>
                    <p className="text-white font-medium">Transactions</p>
                    <p className="text-sm text-slate-500">Alertes pour chaque transaction</p>
                  </div>
                  <Switch
                    checked={notifications.transactions}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, transactions: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50">
                  <div>
                    <p className="text-white font-medium">Securite</p>
                    <p className="text-sm text-slate-500">Alertes de securite importantes</p>
                  </div>
                  <Switch
                    checked={notifications.security}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, security: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50">
                  <div>
                    <p className="text-white font-medium">Rapports</p>
                    <p className="text-sm text-slate-500">Rapports hebdomadaires</p>
                  </div>
                  <Switch
                    checked={notifications.reports}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, reports: checked })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50">
                  <div>
                    <p className="text-white font-medium">Marketing</p>
                    <p className="text-sm text-slate-500">Promotions et nouveautes</p>
                  </div>
                  <Switch
                    checked={notifications.marketing}
                    onCheckedChange={(checked) =>
                      setNotifications({ ...notifications, marketing: checked })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
