"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { BusinessSidebar } from "@/components/business/BusinessSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
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
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";

// Types for API response
interface SessionData {
  id: string;
  device: string;
  browser: string | null;
  os: string | null;
  location: string;
  lastActive: string;
  isCurrent: boolean;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  twoFactorEnabled: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

interface BusinessData {
  id: string;
  name: string;
  registrationNumber: string | null;
  type: string;
  category: string | null;
  status: string;
  description: string | null;
  city: string | null;
  country: string | null;
  email: string;
  phone: string | null;
}

interface SettingsResponse {
  success: boolean;
  data: {
    user: UserData;
    business: BusinessData | null;
    sessions: SessionData[];
  };
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

// Static connected services (can be made dynamic later)
const connectedServices = [
  { id: 1, name: "Google Workspace", status: "disconnected", icon: "G" },
  { id: 2, name: "Microsoft 365", status: "disconnected", icon: "M" },
  { id: 3, name: "Slack", status: "disconnected", icon: "S" },
  { id: 4, name: "QuickBooks", status: "disconnected", icon: "Q" },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [revokingSession, setRevokingSession] = useState<string | null>(null);
  
  // Fetch settings data
  const { data, error, isLoading, mutate } = useSWR<SettingsResponse>(
    "/api/business/settings",
    fetcher,
    {
      revalidateOnFocus: true,
    }
  );

  const settingsData = data?.data;
  const user = settingsData?.user;
  const business = settingsData?.business;
  const sessions = settingsData?.sessions || [];

  // Form state for profile
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    businessName: "",
    businessDescription: "",
    businessCategory: "",
  });

  // Password form state
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // Initialize form data when API data loads
  useEffect(() => {
    if (user && business) {
      setFormData({
        name: user.name || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        country: user.country || "",
        businessName: business.name || "",
        businessDescription: business.description || "",
        businessCategory: business.category || "",
      });
      setTwoFactorEnabled(user.twoFactorEnabled || false);
    }
  }, [user, business]);
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [transactionAlerts, setTransactionAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  // Security settings
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  // Save profile changes
  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/business/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Succes",
          description: "Vos parametres ont ete mis a jour",
        });
        mutate();
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Une erreur est survenue",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les modifications",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Change password
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Erreur",
        description: "Les mots de passe ne correspondent pas",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Erreur",
        description: "Le mot de passe doit contenir au moins 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    setIsChangingPassword(true);
    try {
      const response = await fetch("/api/business/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Succes",
          description: "Votre mot de passe a ete mis a jour",
        });
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Mot de passe actuel incorrect",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de changer le mot de passe",
        variant: "destructive",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // Revoke session
  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSession(sessionId);
    try {
      const response = await fetch(`/api/business/settings?sessionId=${sessionId}`, {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Succes",
          description: "Session revoquee",
        });
        mutate();
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de revoquer la session",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de revoquer la session",
        variant: "destructive",
      });
    } finally {
      setRevokingSession(null);
    }
  };

  // Revoke all sessions
  const handleRevokeAllSessions = async () => {
    setRevokingSession("all");
    try {
      const response = await fetch("/api/business/settings?revokeAll=true", {
        method: "DELETE",
        credentials: "include",
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Succes",
          description: "Toutes les autres sessions ont ete revoquees",
        });
        mutate();
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de revoquer les sessions",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de revoquer les sessions",
        variant: "destructive",
      });
    } finally {
      setRevokingSession(null);
    }
  };

  // Toggle 2FA
  const handleToggle2FA = async (enabled: boolean) => {
    setTwoFactorEnabled(enabled);
    try {
      const response = await fetch("/api/business/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ twoFactorEnabled: enabled }),
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Succes",
          description: enabled ? "2FA active" : "2FA desactive",
        });
      } else {
        setTwoFactorEnabled(!enabled);
        toast({
          title: "Erreur",
          description: result.error || "Impossible de modifier le 2FA",
          variant: "destructive",
        });
      }
    } catch {
      setTwoFactorEnabled(!enabled);
      toast({
        title: "Erreur",
        description: "Impossible de modifier le 2FA",
        variant: "destructive",
      });
    }
  };

  // Format date
  const formatLastActive = (dateStr: string, isCurrent: boolean) => {
    if (isCurrent) return "Actuellement actif";
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    return `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  };

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
            {/* Error State */}
            {error && (
              <Card className="bg-red-500/10 border-red-500/30 rounded-3xl">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/20 rounded-2xl">
                      <AlertCircle className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-400">Erreur de chargement</p>
                      <p className="text-xs text-red-300/70 mt-1">Impossible de charger vos parametres</p>
                    </div>
                    <Button onClick={() => mutate()} className="bg-red-500 hover:bg-red-600 text-xs font-bold">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reessayer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Informations de l&apos;Entreprise</CardTitle>
                <CardDescription className="text-slate-500">Mettez a jour les informations de votre entreprise</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Logo Upload */}
                <div className="flex items-center gap-6">
                  {isLoading ? (
                    <Skeleton className="w-24 h-24 rounded-2xl bg-slate-700" />
                  ) : (
                    <div className="w-24 h-24 rounded-2xl bg-slate-800 flex items-center justify-center text-3xl font-black text-emerald-500">
                      {business?.name?.substring(0, 2).toUpperCase() || "EP"}
                    </div>
                  )}
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
                    {isLoading ? (
                      <Skeleton className="h-10 w-full rounded-xl bg-slate-700" />
                    ) : (
                      <Input 
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        className="bg-slate-800/50 border-white/10 rounded-xl" 
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Numero RCCM</Label>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full rounded-xl bg-slate-700" />
                    ) : (
                      <Input 
                        value={business?.registrationNumber || ""}
                        disabled
                        className="bg-slate-800/50 border-white/10 rounded-xl opacity-50" 
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Email professionnel</Label>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full rounded-xl bg-slate-700" />
                    ) : (
                      <Input 
                        value={user?.email || ""}
                        disabled
                        className="bg-slate-800/50 border-white/10 rounded-xl opacity-50" 
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Telephone</Label>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full rounded-xl bg-slate-700" />
                    ) : (
                      <Input 
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="bg-slate-800/50 border-white/10 rounded-xl" 
                      />
                    )}
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label className="text-slate-300 text-sm font-bold">Adresse</Label>
                    {isLoading ? (
                      <Skeleton className="h-20 w-full rounded-xl bg-slate-700" />
                    ) : (
                      <Textarea 
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="bg-slate-800/50 border-white/10 rounded-xl resize-none" 
                        rows={2} 
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Secteur d&apos;activite</Label>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full rounded-xl bg-slate-700" />
                    ) : (
                      <Select 
                        value={formData.businessCategory || "tech"}
                        onValueChange={(value) => setFormData({ ...formData, businessCategory: value })}
                      >
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
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Ville</Label>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full rounded-xl bg-slate-700" />
                    ) : (
                      <Input 
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        className="bg-slate-800/50 border-white/10 rounded-xl" 
                      />
                    )}
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    className="bg-emerald-500 hover:bg-emerald-600 font-bold"
                    onClick={handleSaveProfile}
                    disabled={isSaving || isLoading}
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
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
                {isLoading ? (
                  <Skeleton className="h-20 w-full rounded-2xl bg-slate-700" />
                ) : (
                  <div className={`flex items-center justify-between p-4 rounded-2xl ${
                    business?.status === "ACTIVE" 
                      ? "bg-emerald-500/10 border border-emerald-500/20" 
                      : "bg-amber-500/10 border border-amber-500/20"
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${
                        business?.status === "ACTIVE" ? "bg-emerald-500/20" : "bg-amber-500/20"
                      }`}>
                        {business?.status === "ACTIVE" ? (
                          <BadgeCheck className="h-6 w-6 text-emerald-500" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-amber-500" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">
                          {business?.status === "ACTIVE" ? "Compte Verifie" : 
                           business?.status === "PENDING_VERIFICATION" ? "En attente de verification" :
                           "Compte non verifie"}
                        </p>
                        <p className="text-xs text-slate-400">
                          {business?.status === "ACTIVE" 
                            ? "Votre entreprise a ete verifiee avec succes" 
                            : "Completez la verification de votre entreprise"}
                        </p>
                      </div>
                    </div>
                    <Badge className={`font-bold ${
                      business?.status === "ACTIVE" 
                        ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" 
                        : "bg-amber-500/20 text-amber-500 border-amber-500/30"
                    }`}>
                      {business?.type || "Business"}
                    </Badge>
                  </div>
                )}
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
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                      className="bg-slate-800/50 border-white/10 rounded-xl pr-10" 
                    />
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
                    <Input 
                      type="password" 
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                      className="bg-slate-800/50 border-white/10 rounded-xl" 
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300 text-sm font-bold">Confirmer le mot de passe</Label>
                    <Input 
                      type="password" 
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                      className="bg-slate-800/50 border-white/10 rounded-xl" 
                    />
                  </div>
                </div>
                <Button 
                  className="bg-emerald-500 hover:bg-emerald-600 font-bold"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !passwordData.currentPassword || !passwordData.newPassword}
                >
                  {isChangingPassword ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Key className="h-4 w-4 mr-2" />
                  )}
                  {isChangingPassword ? "Mise a jour..." : "Mettre a jour le mot de passe"}
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
                    <div className={`p-3 rounded-xl ${twoFactorEnabled ? "bg-emerald-500/10" : "bg-slate-700"}`}>
                      <Smartphone className={`h-5 w-5 ${twoFactorEnabled ? "text-emerald-500" : "text-slate-400"}`} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">Application d&apos;authentification</p>
                      <p className="text-xs text-slate-500">Google Authenticator, Authy, etc.</p>
                    </div>
                  </div>
                  <Switch 
                    checked={twoFactorEnabled} 
                    onCheckedChange={handleToggle2FA}
                    disabled={isLoading}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${biometricEnabled ? "bg-blue-500/10" : "bg-slate-700"}`}>
                      <Fingerprint className={`h-5 w-5 ${biometricEnabled ? "text-blue-500" : "text-slate-400"}`} />
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
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-bold"
                    onClick={handleRevokeAllSessions}
                    disabled={revokingSession === "all" || sessions.filter(s => !s.isCurrent).length === 0}
                  >
                    {revokingSession === "all" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4 mr-2" />
                    )}
                    Deconnecter tout
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-10 h-10 rounded-xl bg-slate-700" />
                        <div>
                          <Skeleton className="h-4 w-40 mb-2 bg-slate-700" />
                          <Skeleton className="h-3 w-32 bg-slate-700" />
                        </div>
                      </div>
                      <Skeleton className="h-8 w-20 bg-slate-700" />
                    </div>
                  ))
                ) : sessions.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Globe className="h-12 w-12 mx-auto mb-3 text-slate-600" />
                    <p className="text-sm font-bold">Aucune session active</p>
                  </div>
                ) : (
                  sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/30 border border-white/5">
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-xl ${session.isCurrent ? "bg-emerald-500/10" : "bg-slate-700"}`}>
                          <Globe className={`h-5 w-5 ${session.isCurrent ? "text-emerald-500" : "text-slate-400"}`} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold text-white">{session.device}</p>
                            {session.isCurrent && (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">
                                Actuel
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">
                            {session.location} - {formatLastActive(session.lastActive, session.isCurrent)}
                          </p>
                        </div>
                      </div>
                      {!session.isCurrent && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-red-500 hover:bg-red-500/10 text-xs font-bold"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingSession === session.id}
                        >
                          {revokingSession === session.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Revoquer"
                          )}
                        </Button>
                      )}
                    </div>
                  ))
                )}
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
