"use client";

import { useState, useEffect, useRef } from "react";
import { AgentSidebar } from "@/components/hub/AgentSidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
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
  Camera,
  Loader2,
  Delete,
  CheckCircle2,
  QrCode,
} from "lucide-react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import Image from "next/image";

interface UserData {
  id: string;
  username: string | null;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  kycStatus: string;
  country: string | null;
  avatar: string | null;
}

const fetcher = (url: string) => fetch(url, { credentials: "include" }).then(res => res.json());

export default function AgentSettingsPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState({
    transactions: true,
    marketing: false,
    security: true,
    reports: true,
  });

  // User Data
  const { data: userData, isLoading: userLoading } = useSWR<UserData>("/api/user/settings", fetcher);

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [saving, setSaving] = useState(false);

  // Avatar upload
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // PIN Modal
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [pinStep, setPinStep] = useState<1 | 2 | 3>(1);
  const [pins, setPins] = useState({ 1: "", 2: "", 3: "" });
  const [pinShake, setPinShake] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  // 2FA Modal
  const [twoFaModalOpen, setTwoFaModalOpen] = useState(false);
  const [twoFaStep, setTwoFaStep] = useState<"setup" | "verify" | "disable">("setup");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [twoFaSecret, setTwoFaSecret] = useState("");
  const [twoFaQrData, setTwoFaQrData] = useState("");
  const [twoFaLoading, setTwoFaLoading] = useState(false);

  // 2FA Status
  const { data: twoFaStatus } = useSWR("/api/auth/2fa/status", fetcher);

  // Initialize form data
  useEffect(() => {
    if (userData) {
      setFormData({
        firstName: userData.firstName || "",
        lastName: userData.lastName || "",
        phone: userData.phone || "",
        email: userData.email || "",
      });
    }
  }, [userData]);

  // Save profile
  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("Profil mis a jour avec succes");
        mutate("/api/user/settings");
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de la mise a jour");
      }
    } catch {
      toast.error("Erreur serveur");
    } finally {
      setSaving(false);
    }
  };

  // Avatar upload
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userData?.id) return;

    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append("avatar", file);
      formData.append("userId", userData.id);

      const res = await fetch("/api/user/avatar", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (res.ok) {
        toast.success("Avatar mis a jour");
        mutate("/api/user/settings");
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de l'upload");
      }
    } catch {
      toast.error("Erreur serveur");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // PIN Functions
  const resetPinModal = () => {
    setPinStep(1);
    setPins({ 1: "", 2: "", 3: "" });
    setPinLoading(false);
    setPinShake(false);
  };

  const handlePinNumberPress = (num: number) => {
    if (pinLoading || pinShake) return;
    setPins((prev) => {
      const current = prev[pinStep];
      if (current.length < 4) {
        return { ...prev, [pinStep]: current + num };
      }
      return prev;
    });
  };

  const handlePinDelete = () => {
    if (pinLoading) return;
    setPins((prev) => ({
      ...prev,
      [pinStep]: prev[pinStep].slice(0, -1),
    }));
  };

  // Validate PIN step
  useEffect(() => {
    const currentPin = pins[pinStep];
    if (currentPin.length !== 4 || pinLoading) return;

    const validatePin = async () => {
      if (pinStep === 1) {
        setPinLoading(true);
        try {
          const res = await fetch("/api/security/verify-pin", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ pin: currentPin }),
          });

          if (res.ok) {
            setPinStep(2);
          } else {
            setPinShake(true);
            setTimeout(() => setPinShake(false), 500);
            toast.error("Code PIN actuel incorrect");
            setPins(p => ({ ...p, 1: "" }));
          }
        } catch {
          toast.error("Erreur serveur");
        } finally {
          setPinLoading(false);
        }
      } else if (pinStep === 2) {
        setPinStep(3);
      } else if (pinStep === 3) {
        if (pins[3] !== pins[2]) {
          setPinShake(true);
          setTimeout(() => setPinShake(false), 500);
          toast.error("Les codes ne correspondent pas");
          setPins(p => ({ ...p, 3: "" }));
          return;
        }
        
        setPinLoading(true);
        try {
          const res = await fetch("/api/security/update-pin", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ newPin: pins[3] }),
          });

          if (res.ok) {
            toast.success("Code PIN mis a jour avec succes");
            setPinModalOpen(false);
            resetPinModal();
          } else {
            const data = await res.json();
            toast.error(data.error || "Erreur lors de la mise a jour");
            resetPinModal();
          }
        } catch {
          toast.error("Erreur serveur");
          resetPinModal();
        } finally {
          setPinLoading(false);
        }
      }
    };

    validatePin();
  }, [pins, pinStep, pinLoading]);

  // 2FA Functions
  const handleSetup2FA = async () => {
    setTwoFaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", {
        method: "POST",
        credentials: "include",
      });

      const data = await res.json();
      if (res.ok) {
        setTwoFaSecret(data.secret);
        setTwoFaQrData(data.qrData);
        setTwoFaStep("verify");
      } else {
        toast.error(data.error || "Erreur lors de la configuration");
      }
    } catch {
      toast.error("Erreur serveur");
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (twoFaCode.length !== 6) {
      toast.error("Entrez un code a 6 chiffres");
      return;
    }

    setTwoFaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: twoFaCode }),
      });

      if (res.ok) {
        toast.success("Google Authenticator active avec succes");
        setTwoFaModalOpen(false);
        setTwoFaCode("");
        setTwoFaStep("setup");
        mutate("/api/auth/2fa/status");
      } else {
        const data = await res.json();
        toast.error(data.error || "Code incorrect");
      }
    } catch {
      toast.error("Erreur serveur");
    } finally {
      setTwoFaLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    if (twoFaCode.length !== 6) {
      toast.error("Entrez un code a 6 chiffres");
      return;
    }

    setTwoFaLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: twoFaCode }),
      });

      if (res.ok) {
        toast.success("Google Authenticator desactive");
        setTwoFaModalOpen(false);
        setTwoFaCode("");
        setTwoFaStep("setup");
        mutate("/api/auth/2fa/status");
      } else {
        const data = await res.json();
        toast.error(data.error || "Code incorrect");
      }
    } catch {
      toast.error("Erreur serveur");
    } finally {
      setTwoFaLoading(false);
    }
  };

  const open2FAModal = () => {
    if (twoFaStatus?.enabled) {
      setTwoFaStep("disable");
    } else {
      setTwoFaStep("setup");
    }
    setTwoFaCode("");
    setTwoFaModalOpen(true);
  };

  const getInitials = () => {
    const first = userData?.firstName?.[0] || userData?.name?.[0] || "";
    const last = userData?.lastName?.[0] || "";
    return (first + last).toUpperCase() || "U";
  };

  const pinTitles = ["", "Code PIN Actuel", "Nouveau Code PIN", "Confirmer le PIN"];
  const pinSubtitles = ["", "Verification de securite", "Choisissez 4 chiffres", "Confirmez votre nouveau code"];

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
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="relative group">
                <Avatar className="h-20 w-20 border-2 border-emerald-500/30">
                  {userData?.avatar ? (
                    <AvatarImage src={userData.avatar} alt="Avatar" />
                  ) : null}
                  <AvatarFallback className="bg-emerald-500/30 text-emerald-500 text-xl font-black">
                    {userLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : getInitials()}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={handleAvatarClick}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center bg-black/60 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                >
                  {uploadingAvatar ? (
                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                  ) : (
                    <Camera className="h-5 w-5 text-white" />
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <h2 className="text-xl font-black text-white">
                    {userLoading ? "Chargement..." : `${userData?.firstName || ""} ${userData?.lastName || ""}`.trim() || userData?.username || "Agent"}
                  </h2>
                  {userData?.kycStatus === "VERIFIED" || userData?.kycStatus === "APPROVED" ? (
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                      <BadgeCheck className="h-3 w-3 mr-1" />
                      Verifie
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                      Non verifie
                    </Badge>
                  )}
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2 text-sm text-slate-400">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {userData?.country || "Localisation non definie"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" />
                    ID: {userData?.id?.slice(0, 8) || "---"}
                  </span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="border-white/10 text-white"
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
              >
                {uploadingAvatar ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4 mr-2" />
                )}
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
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="bg-slate-800/50 border-white/10 text-white"
                    placeholder="Votre prenom"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-400">Nom</Label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="bg-slate-800/50 border-white/10 text-white"
                    placeholder="Votre nom"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  Telephone
                </Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="bg-slate-800/50 border-white/10 text-white"
                  placeholder="+237 6XX XXX XXX"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-400 flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  Email
                </Label>
                <Input
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-slate-800/50 border-white/10 text-white"
                  placeholder="votre@email.com"
                />
              </div>
              <Button 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
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
              <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-blue-500/20">
                      <Lock className="h-5 w-5 text-blue-500" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Code PIN</p>
                      <p className="text-sm text-slate-500">Protection des transactions</p>
                    </div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-white/10 text-white"
                    onClick={() => {
                      resetPinModal();
                      setPinModalOpen(true);
                    }}
                  >
                    Modifier
                  </Button>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-800/50 border border-white/5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-xl bg-emerald-500/20">
                      <Smartphone className="h-5 w-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-white font-medium">Google Authenticator</p>
                      <p className="text-sm text-slate-500">
                        {twoFaStatus?.enabled ? "Active" : "Non active"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {twoFaStatus?.enabled && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Active
                      </Badge>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="border-white/10 text-white"
                      onClick={open2FAModal}
                    >
                      {twoFaStatus?.enabled ? "Desactiver" : "Configurer"}
                    </Button>
                  </div>
                </div>
              </div>
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

      {/* PIN Change Modal */}
      <Dialog open={pinModalOpen} onOpenChange={(open) => {
        setPinModalOpen(open);
        if (!open) resetPinModal();
      }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black">
              {pinTitles[pinStep]}
            </DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              {pinSubtitles[pinStep]}
            </DialogDescription>
          </DialogHeader>

          <div className={`space-y-6 ${pinShake ? "animate-shake" : ""}`}>
            {/* PIN dots */}
            <div className="flex justify-center gap-4 py-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    pins[pinStep].length > i
                      ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] scale-110"
                      : "bg-slate-800 border border-white/10"
                  }`}
                />
              ))}
            </div>

            {/* Number pad */}
            <div className="grid grid-cols-3 gap-3 max-w-xs mx-auto">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => handlePinNumberPress(num)}
                  disabled={pinLoading}
                  className="h-14 text-xl font-bold rounded-xl bg-slate-800/50 hover:bg-white/10 active:bg-emerald-600/20 active:text-emerald-500 transition-all text-white disabled:opacity-50"
                >
                  {num}
                </button>
              ))}
              <div />
              <button
                type="button"
                onClick={() => handlePinNumberPress(0)}
                disabled={pinLoading}
                className="h-14 text-xl font-bold rounded-xl bg-slate-800/50 hover:bg-white/10 active:bg-emerald-600/20 active:text-emerald-500 transition-all text-white disabled:opacity-50"
              >
                0
              </button>
              <button
                type="button"
                onClick={handlePinDelete}
                disabled={pinLoading}
                className="h-14 flex items-center justify-center rounded-xl text-slate-400 hover:text-white active:scale-90 transition-all disabled:opacity-50"
              >
                <Delete size={20} />
              </button>
            </div>

            {pinLoading && (
              <div className="text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto text-emerald-500" />
                <p className="text-xs text-slate-500 mt-2">Verification en cours...</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Modal */}
      <Dialog open={twoFaModalOpen} onOpenChange={setTwoFaModalOpen}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-black flex items-center justify-center gap-2">
              <Smartphone className="h-5 w-5 text-emerald-500" />
              {twoFaStep === "disable" ? "Desactiver 2FA" : "Google Authenticator"}
            </DialogTitle>
            <DialogDescription className="text-center text-slate-400">
              {twoFaStep === "setup" && "Configurez l'authentification a deux facteurs"}
              {twoFaStep === "verify" && "Scannez le QR code avec Google Authenticator"}
              {twoFaStep === "disable" && "Entrez votre code pour desactiver"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {twoFaStep === "setup" && (
              <div className="text-center space-y-4">
                <div className="p-4 rounded-2xl bg-slate-800/50">
                  <p className="text-sm text-slate-300">
                    L&apos;authentification a deux facteurs ajoute une couche de securite supplementaire a votre compte.
                  </p>
                </div>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleSetup2FA}
                  disabled={twoFaLoading}
                >
                  {twoFaLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <QrCode className="h-4 w-4 mr-2" />
                  )}
                  Generer le QR Code
                </Button>
              </div>
            )}

            {twoFaStep === "verify" && (
              <div className="space-y-4">
                {twoFaQrData && (
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-2xl">
                      <Image
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(twoFaQrData)}`}
                        alt="QR Code"
                        width={200}
                        height={200}
                        className="rounded-lg"
                      />
                    </div>
                  </div>
                )}
                
                {twoFaSecret && (
                  <div className="p-3 rounded-xl bg-slate-800/50 border border-white/10">
                    <p className="text-xs text-slate-400 mb-1">Code secret (saisie manuelle)</p>
                    <p className="text-sm font-mono text-emerald-400 break-all">{twoFaSecret}</p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-400">Code de verification</Label>
                  <Input
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="bg-slate-800/50 border-white/10 text-white text-center text-xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                  onClick={handleVerify2FA}
                  disabled={twoFaLoading || twoFaCode.length !== 6}
                >
                  {twoFaLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Activer
                </Button>
              </div>
            )}

            {twoFaStep === "disable" && (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-300">
                    Attention: Desactiver l&apos;authentification a deux facteurs reduira la securite de votre compte.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-slate-400">Code Google Authenticator</Label>
                  <Input
                    value={twoFaCode}
                    onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className="bg-slate-800/50 border-white/10 text-white text-center text-xl tracking-widest"
                    placeholder="000000"
                    maxLength={6}
                  />
                </div>

                <Button
                  className="w-full bg-red-600 hover:bg-red-700"
                  onClick={handleDisable2FA}
                  disabled={twoFaLoading || twoFaCode.length !== 6}
                >
                  {twoFaLoading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-2" />
                  )}
                  Desactiver
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <style jsx global>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .animate-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
      `}</style>
    </div>
  );
}
