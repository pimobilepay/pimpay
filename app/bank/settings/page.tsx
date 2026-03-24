"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { BankSidebar } from "@/components/bank/BankSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Settings,
  Landmark,
  Menu,
  X,
  Shield,
  Bell,
  Globe,
  Lock,
  Key,
  Smartphone,
  Mail,
  Building2,
  Users,
  FileText,
  Database,
  Server,
  Wifi,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Save,
  RefreshCw,
  Loader2,
  AlertCircle,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";

// Types for API response
interface SystemStatus {
  server: { status: string; uptime: string };
  database: { status: string; latency: string };
  api: { status: string; responseTime: string };
  maintenance: { scheduled: boolean; message: string } | null;
}

interface BankSettingsResponse {
  settings: {
    general: {
      institutionName: string;
      timezone: string;
      language: string;
      currency: string;
    };
    security: {
      twoFactorRequired: boolean;
      sessionTimeout: number;
      ipWhitelist: boolean;
      auditLogging: boolean;
    };
    notifications: {
      emailAlerts: boolean;
      smsAlerts: boolean;
      pushNotifications: boolean;
      dailyDigest: boolean;
    };
    compliance: {
      kycRequired: boolean;
      amlMonitoring: boolean;
      transactionLimit: number;
      autoFlagThreshold: number;
    };
    api: {
      rateLimit: number;
      webhooksEnabled: boolean;
      sandboxMode: boolean;
    };
  };
  currentUser: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    twoFactorEnabled: boolean;
    role: string;
  } | null;
  systemStatus: SystemStatus;
  activeSessions: number;
  maintenanceMode: boolean;
}

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((res) => res.json());

export default function SettingsPage() {
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("general");
  const [isSaving, setIsSaving] = useState(false);
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  // Fetch settings data from API
  const { data, error, isLoading, mutate } = useSWR<BankSettingsResponse>(
    "/api/bank/settings",
    fetcher,
    {
      revalidateOnFocus: true,
    }
  );

  // Local settings state
  const [settings, setSettings] = useState({
    // General
    institutionName: "PimPay Institution Financiere",
    timezone: "Africa/Kinshasa",
    language: "fr",
    currency: "USD",
    
    // Security
    twoFactorRequired: true,
    sessionTimeout: "30",
    ipWhitelist: true,
    auditLogging: true,
    
    // Notifications
    emailAlerts: true,
    smsAlerts: false,
    pushNotifications: true,
    dailyDigest: true,
    
    // Compliance
    kycRequired: true,
    amlMonitoring: true,
    transactionLimit: "500000",
    autoFlagThreshold: "100000",
  });

  // Initialize settings from API data
  useEffect(() => {
    if (data?.settings) {
      setSettings({
        institutionName: data.settings.general.institutionName,
        timezone: data.settings.general.timezone,
        language: data.settings.general.language,
        currency: data.settings.general.currency,
        twoFactorRequired: data.settings.security.twoFactorRequired,
        sessionTimeout: String(data.settings.security.sessionTimeout),
        ipWhitelist: data.settings.security.ipWhitelist,
        auditLogging: data.settings.security.auditLogging,
        emailAlerts: data.settings.notifications.emailAlerts,
        smsAlerts: data.settings.notifications.smsAlerts,
        pushNotifications: data.settings.notifications.pushNotifications,
        dailyDigest: data.settings.notifications.dailyDigest,
        kycRequired: data.settings.compliance.kycRequired,
        amlMonitoring: data.settings.compliance.amlMonitoring,
        transactionLimit: String(data.settings.compliance.transactionLimit),
        autoFlagThreshold: String(data.settings.compliance.autoFlagThreshold),
      });
    }
  }, [data]);

  const handleSettingChange = (key: string, value: string | boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  // Save settings by section
  const handleSaveSection = async (section: string) => {
    setSavingSection(section);
    setIsSaving(true);

    let sectionSettings = {};
    
    switch (section) {
      case "general":
        sectionSettings = {
          institutionName: settings.institutionName,
          timezone: settings.timezone,
          language: settings.language,
          currency: settings.currency,
        };
        break;
      case "security":
        sectionSettings = {
          twoFactorRequired: settings.twoFactorRequired,
          sessionTimeout: parseInt(settings.sessionTimeout),
          ipWhitelist: settings.ipWhitelist,
          auditLogging: settings.auditLogging,
        };
        break;
      case "notifications":
        sectionSettings = {
          emailAlerts: settings.emailAlerts,
          smsAlerts: settings.smsAlerts,
          pushNotifications: settings.pushNotifications,
          dailyDigest: settings.dailyDigest,
        };
        break;
      case "compliance":
        sectionSettings = {
          kycRequired: settings.kycRequired,
          amlMonitoring: settings.amlMonitoring,
          transactionLimit: parseInt(settings.transactionLimit),
          autoFlagThreshold: parseInt(settings.autoFlagThreshold),
        };
        break;
    }

    try {
      const response = await fetch("/api/bank/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ section, settings: sectionSettings }),
      });

      const result = await response.json();

      if (response.ok) {
        toast({
          title: "Succes",
          description: "Parametres mis a jour",
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
        description: "Impossible de sauvegarder les parametres",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
      setSavingSection(null);
    }
  };

  // Generate new API key
  const handleGenerateApiKey = async (keyType: "test" | "live") => {
    setIsGeneratingKey(true);
    try {
      const response = await fetch("/api/bank/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "generate_api_key", keyType }),
      });

      const result = await response.json();

      if (response.ok) {
        setGeneratedKey(result.key);
        setShowApiKey(true);
        toast({
          title: "Cle generee",
          description: result.warning,
        });
      } else {
        toast({
          title: "Erreur",
          description: result.error || "Impossible de generer la cle",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Erreur",
        description: "Impossible de generer la cle API",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingKey(false);
    }
  };

  // Copy to clipboard
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({
      title: "Copie",
      description: "Cle API copiee dans le presse-papiers",
    });
  };

  // Get system status color
  const getStatusColor = (status: string) => {
    return status === "operational" ? "emerald" : status === "degraded" ? "amber" : "red";
  };

  return (
    <div className="flex min-h-screen bg-[#02040a]">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <BankSidebar />
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/80" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute left-0 top-0 h-full w-64 bg-slate-950 border-r border-white/5 overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
                  <Landmark className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-black text-white">PIMPAY</h1>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Institution</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-xl bg-white/5 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <BankSidebar isMobile />
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
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border border-white/10">
              <Landmark className="h-5 w-5 text-white" />
            </div>
          </div>
        </div>

        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">Parametres</h1>
              <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[9px] font-bold">
                <Settings className="h-3 w-3 mr-1" />
                Configuration
              </Badge>
            </div>
            <p className="text-sm text-slate-500">Configuration du portail et preferences systeme</p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold"
              onClick={() => handleSaveSection(activeTab)}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? "Enregistrement..." : "Enregistrer"}
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="border-white/10 bg-slate-900/50"
              onClick={() => mutate()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 text-slate-400 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-slate-900/50 border border-white/5 p-1 rounded-2xl flex-wrap h-auto">
            <TabsTrigger value="general" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <Building2 className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="security" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <Shield className="h-4 w-4 mr-2" />
              Securite
            </TabsTrigger>
            <TabsTrigger value="notifications" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
            <TabsTrigger value="compliance" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <FileText className="h-4 w-4 mr-2" />
              Conformite
            </TabsTrigger>
            <TabsTrigger value="api" className="rounded-xl text-xs font-bold data-[state=active]:bg-white/10">
              <Server className="h-4 w-4 mr-2" />
              API
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general">
            {/* Error State */}
            {error && (
              <Card className="bg-red-500/10 border-red-500/30 rounded-3xl mb-6">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-red-500/20 rounded-2xl">
                      <AlertCircle className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-400">Erreur de chargement</p>
                      <p className="text-xs text-red-300/70 mt-1">Impossible de charger les parametres</p>
                    </div>
                    <Button onClick={() => mutate()} className="bg-red-500 hover:bg-red-600 text-xs font-bold">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Reessayer
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-white">Informations Institution</CardTitle>
                  <CardDescription className="text-slate-500">Details de votre organisation</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400">Nom de l&apos;institution</Label>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full bg-slate-700" />
                    ) : (
                      <Input
                        value={settings.institutionName}
                        onChange={(e) => handleSettingChange('institutionName', e.target.value)}
                        className="bg-slate-800/50 border-white/10 text-white"
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400">Fuseau horaire</Label>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full bg-slate-700" />
                    ) : (
                      <Select value={settings.timezone} onValueChange={(v) => handleSettingChange('timezone', v)}>
                        <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          <SelectItem value="Africa/Kinshasa">Africa/Kinshasa (UTC+1)</SelectItem>
                          <SelectItem value="Africa/Lagos">Africa/Lagos (UTC+1)</SelectItem>
                          <SelectItem value="Europe/Paris">Europe/Paris (UTC+1)</SelectItem>
                          <SelectItem value="UTC">UTC</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400">Langue par defaut</Label>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full bg-slate-700" />
                    ) : (
                      <Select value={settings.language} onValueChange={(v) => handleSettingChange('language', v)}>
                        <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          <SelectItem value="fr">Francais</SelectItem>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="sw">Swahili</SelectItem>
                          <SelectItem value="ln">Lingala</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400">Devise principale</Label>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full bg-slate-700" />
                    ) : (
                      <Select value={settings.currency} onValueChange={(v) => handleSettingChange('currency', v)}>
                        <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10">
                          <SelectItem value="USD">USD - Dollar americain</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="CDF">CDF - Franc congolais</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                      onClick={() => handleSaveSection("general")}
                      disabled={savingSection === "general"}
                    >
                      {savingSection === "general" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-white">Statut du Systeme</CardTitle>
                  <CardDescription className="text-slate-500">Etat des services</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-700" />
                    ))
                  ) : (
                    <>
                      <div className={`p-4 rounded-2xl bg-${getStatusColor(data?.systemStatus?.server?.status || "operational")}-500/10 border border-${getStatusColor(data?.systemStatus?.server?.status || "operational")}-500/20`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Server className={`h-5 w-5 text-${getStatusColor(data?.systemStatus?.server?.status || "operational")}-500`} />
                            <div>
                              <span className="text-sm font-bold text-white">Serveur Principal</span>
                              <p className="text-[10px] text-slate-500">Uptime: {data?.systemStatus?.server?.uptime || "99.9%"}</p>
                            </div>
                          </div>
                          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[9px] font-bold">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Operationnel
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Database className="h-5 w-5 text-emerald-500" />
                            <div>
                              <span className="text-sm font-bold text-white">Base de Donnees</span>
                              <p className="text-[10px] text-slate-500">Latence: {data?.systemStatus?.database?.latency || "12ms"}</p>
                            </div>
                          </div>
                          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[9px] font-bold">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Operationnel
                          </Badge>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Wifi className="h-5 w-5 text-emerald-500" />
                            <div>
                              <span className="text-sm font-bold text-white">API Gateway</span>
                              <p className="text-[10px] text-slate-500">Temps reponse: {data?.systemStatus?.api?.responseTime || "45ms"}</p>
                            </div>
                          </div>
                          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/30 text-[9px] font-bold">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Operationnel
                          </Badge>
                        </div>
                      </div>
                      {data?.systemStatus?.maintenance ? (
                        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Clock className="h-5 w-5 text-amber-500" />
                              <div>
                                <span className="text-sm font-bold text-white">Maintenance Planifiee</span>
                                <p className="text-[10px] text-slate-500">{data.systemStatus.maintenance.message || "Maintenance prevue"}</p>
                              </div>
                            </div>
                            <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 text-[9px] font-bold">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Planifie
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Clock className="h-5 w-5 text-slate-400" />
                              <div>
                                <span className="text-sm font-bold text-white">Maintenance</span>
                                <p className="text-[10px] text-slate-500">Sessions actives: {data?.activeSessions || 0}</p>
                              </div>
                            </div>
                            <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[9px] font-bold">
                              Aucune planifiee
                            </Badge>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-white">Authentification</CardTitle>
                  <CardDescription className="text-slate-500">Parametres de securite des connexions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <Smartphone className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">2FA Obligatoire</p>
                        <p className="text-[10px] text-slate-500">Exiger l&apos;authentification a deux facteurs</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.twoFactorRequired}
                      onCheckedChange={(v) => handleSettingChange('twoFactorRequired', v)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400">Expiration de session (minutes)</Label>
                    <Select value={settings.sessionTimeout} onValueChange={(v) => handleSettingChange('sessionTimeout', v)}>
                      <SelectTrigger className="bg-slate-800/50 border-white/10 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-white/10">
                        <SelectItem value="15">15 minutes</SelectItem>
                        <SelectItem value="30">30 minutes</SelectItem>
                        <SelectItem value="60">1 heure</SelectItem>
                        <SelectItem value="120">2 heures</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10">
                        <Globe className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Liste blanche IP</p>
                        <p className="text-[10px] text-slate-500">Restreindre l&apos;acces a des IPs specifiques</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.ipWhitelist}
                      onCheckedChange={(v) => handleSettingChange('ipWhitelist', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10">
                        <FileText className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Journal d&apos;audit</p>
                        <p className="text-[10px] text-slate-500">Enregistrer toutes les actions</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.auditLogging}
                      onCheckedChange={(v) => handleSettingChange('auditLogging', v)}
                    />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button 
                      className="bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                      onClick={() => handleSaveSection("security")}
                      disabled={savingSection === "security"}
                    >
                      {savingSection === "security" ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-white">Cles API</CardTitle>
                  <CardDescription className="text-slate-500">Gestion des acces API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {generatedKey && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5 text-emerald-500" />
                          <span className="text-sm font-bold text-white">Nouvelle Cle Generee</span>
                        </div>
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Nouvelle</Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          value={generatedKey}
                          readOnly
                          className="bg-slate-900/50 border-white/10 text-emerald-400 text-xs font-mono"
                        />
                        <Button 
                          variant="outline" 
                          size="icon" 
                          className="border-white/10 shrink-0"
                          onClick={() => setShowApiKey(!showApiKey)}
                        >
                          {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-white/10 text-xs font-bold shrink-0"
                          onClick={() => handleCopyKey(generatedKey)}
                        >
                          <Copy className="h-4 w-4 mr-1" />
                          Copier
                        </Button>
                      </div>
                      <p className="text-[10px] text-amber-400 mt-2">Cette cle ne sera affichee qu&apos;une seule fois. Conservez-la en securite.</p>
                    </div>
                  )}
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-slate-400" />
                        <span className="text-sm font-bold text-white">Cle Production</span>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-bold">Active</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        value="pk_live_xxxxxxxxxxxxxxxxxxxxxxxx"
                        readOnly
                        className="bg-slate-900/50 border-white/10 text-slate-400 text-xs font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-white/10 text-xs font-bold shrink-0"
                        onClick={() => handleGenerateApiKey("live")}
                        disabled={isGeneratingKey}
                      >
                        {isGeneratingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerer"}
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Key className="h-5 w-5 text-slate-400" />
                        <span className="text-sm font-bold text-white">Cle Test</span>
                      </div>
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[9px] font-bold">Test</Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="password"
                        value="pk_test_xxxxxxxxxxxxxxxxxxxxxxxx"
                        readOnly
                        className="bg-slate-900/50 border-white/10 text-slate-400 text-xs font-mono"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-white/10 text-xs font-bold shrink-0"
                        onClick={() => handleGenerateApiKey("test")}
                        disabled={isGeneratingKey}
                      >
                        {isGeneratingKey ? <Loader2 className="h-4 w-4 animate-spin" /> : "Regenerer"}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Preferences de Notifications</CardTitle>
                <CardDescription className="text-slate-500">Configurez comment vous souhaitez etre notifie</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <Mail className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Alertes Email</p>
                        <p className="text-[10px] text-slate-500">Recevoir les alertes par email</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.emailAlerts}
                      onCheckedChange={(v) => handleSettingChange('emailAlerts', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-500/10">
                        <Smartphone className="h-5 w-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Alertes SMS</p>
                        <p className="text-[10px] text-slate-500">Recevoir les alertes par SMS</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.smsAlerts}
                      onCheckedChange={(v) => handleSettingChange('smsAlerts', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/10">
                        <Bell className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Notifications Push</p>
                        <p className="text-[10px] text-slate-500">Notifications dans le navigateur</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(v) => handleSettingChange('pushNotifications', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-slate-500/10">
                        <FileText className="h-5 w-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Resume Quotidien</p>
                        <p className="text-[10px] text-slate-500">Email recapitulatif chaque jour</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.dailyDigest}
                      onCheckedChange={(v) => handleSettingChange('dailyDigest', v)}
                    />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                    onClick={() => handleSaveSection("notifications")}
                    disabled={savingSection === "notifications"}
                  >
                    {savingSection === "notifications" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Settings */}
          <TabsContent value="compliance">
            <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-black text-white">Parametres de Conformite</CardTitle>
                <CardDescription className="text-slate-500">Configuration KYC et AML</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-blue-500/10">
                        <Users className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">KYC Obligatoire</p>
                        <p className="text-[10px] text-slate-500">Verification d&apos;identite requise</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.kycRequired}
                      onCheckedChange={(v) => handleSettingChange('kycRequired', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-red-500/10">
                        <Shield className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Monitoring AML</p>
                        <p className="text-[10px] text-slate-500">Detection anti-blanchiment active</p>
                      </div>
                    </div>
                    <Switch
                      checked={settings.amlMonitoring}
                      onCheckedChange={(v) => handleSettingChange('amlMonitoring', v)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400">Limite transaction (USD)</Label>
                    <Input
                      type="number"
                      value={settings.transactionLimit}
                      onChange={(e) => handleSettingChange('transactionLimit', e.target.value)}
                      className="bg-slate-800/50 border-white/10 text-white"
                    />
                    <p className="text-[10px] text-slate-500">Montant max. sans approbation</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-400">Seuil alerte auto (USD)</Label>
                    <Input
                      type="number"
                      value={settings.autoFlagThreshold}
                      onChange={(e) => handleSettingChange('autoFlagThreshold', e.target.value)}
                      className="bg-slate-800/50 border-white/10 text-white"
                    />
                    <p className="text-[10px] text-slate-500">Declencheur verification renforcee</p>
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button 
                    className="bg-blue-600 hover:bg-blue-700 text-xs font-bold"
                    onClick={() => handleSaveSection("compliance")}
                    disabled={savingSection === "compliance"}
                  >
                    {savingSection === "compliance" ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Settings */}
          <TabsContent value="api">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-white">Configuration API</CardTitle>
                  <CardDescription className="text-slate-500">Parametres d&apos;integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <p className="text-sm font-bold text-white mb-2">Endpoint Production</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-emerald-400 bg-slate-900/50 px-3 py-2 rounded-lg block flex-1">
                        https://api.pimpay.com/v1
                      </code>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="border-white/10 shrink-0"
                        onClick={() => handleCopyKey("https://api.pimpay.com/v1")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <p className="text-sm font-bold text-white mb-2">Endpoint Sandbox</p>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-amber-400 bg-slate-900/50 px-3 py-2 rounded-lg block flex-1">
                        https://sandbox.pimpay.com/v1
                      </code>
                      <Button 
                        variant="outline" 
                        size="icon" 
                        className="border-white/10 shrink-0"
                        onClick={() => handleCopyKey("https://sandbox.pimpay.com/v1")}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                    <p className="text-sm font-bold text-white mb-2">Webhook URL</p>
                    <div className="flex items-center gap-2">
                      <Input
                        placeholder="https://votre-serveur.com/webhook"
                        className="bg-slate-900/50 border-white/10 text-white text-xs"
                      />
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-white/10 text-xs font-bold shrink-0"
                        onClick={() => toast({ title: "Test", description: "Webhook envoye avec succes" })}
                      >
                        Tester
                      </Button>
                    </div>
                  </div>
                  <Button variant="outline" className="w-full border-white/10 text-xs font-bold">
                    <FileText className="h-4 w-4 mr-2" />
                    Voir la documentation API
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-slate-900/50 border-white/5 rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-lg font-black text-white">Statistiques API</CardTitle>
                  <CardDescription className="text-slate-500">Utilisation de l&apos;API</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-16 w-full rounded-2xl bg-slate-700" />
                    ))
                  ) : (
                    <>
                      <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">Requetes aujourd&apos;hui</p>
                            <p className="text-2xl font-black text-emerald-500">12,458</p>
                          </div>
                          <div className="p-3 bg-emerald-500/10 rounded-xl">
                            <Server className="h-6 w-6 text-emerald-500" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">Limite de taux</p>
                            <p className="text-2xl font-black text-blue-500">{data?.settings?.api?.rateLimit || 1000}/min</p>
                          </div>
                          <div className="p-3 bg-blue-500/10 rounded-xl">
                            <Clock className="h-6 w-6 text-blue-500" />
                          </div>
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-white">Mode Sandbox</p>
                            <p className="text-lg font-black text-slate-400">{data?.settings?.api?.sandboxMode ? "Active" : "Desactive"}</p>
                          </div>
                          <Badge className={`${data?.settings?.api?.sandboxMode ? "bg-amber-500/20 text-amber-500 border-amber-500/30" : "bg-emerald-500/20 text-emerald-500 border-emerald-500/30"} text-[9px] font-bold`}>
                            {data?.settings?.api?.sandboxMode ? "Test" : "Production"}
                          </Badge>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
