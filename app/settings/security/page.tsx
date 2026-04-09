"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  ShieldCheck, Fingerprint, KeyRound,
  Mail, MessageCircle, ChevronRight,
  Lock, ArrowLeft, ShieldAlert, Monitor,
  Smartphone, Trash2, Shield, Loader2,
  Globe, Cpu, Wifi, ChevronDown, ChevronUp,
  X, Copy, Check, Tablet, Scan, Mic, Eye
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import * as faceapi from "face-api.js";

// Face Recognition Constants
const FACE_MATCH_THRESHOLD = 0.5; // Lower = more strict matching
const FACE_DESCRIPTOR_STORAGE_KEY = "pimpay_face_descriptor";
// Load models from CDN for reliability
const MODELS_URL = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

interface SessionData {
  id: string;
  deviceName: string;
  os: string;
  osName: string;
  osVersion: string;
  browser: string;
  browserVersion: string;
  deviceVendor: string | null;
  deviceModel: string | null;
  deviceType: string;
  engineName: string | null;
  cpuArch: string | null;
  ip: string;
  city: string | null;
  country: string | null;
  isMobile: boolean;
  lastActiveAt: string;
  isCurrent: boolean;
}

export default function SecurityPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [otpEmail, setOtpEmail] = useState(false);
  const [otpSms, setOtpSms] = useState(false);
  const [biometric, setBiometric] = useState(false);
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Email 2FA states
  const [showEmail2faModal, setShowEmail2faModal] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [emailCodeSent, setEmailCodeSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  // SMS 2FA states
  const [showSms2faModal, setShowSms2faModal] = useState(false);
  const [smsCode, setSmsCode] = useState("");
  const [smsCodeSent, setSmsCodeSent] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);

  // Biometric states
  const [faceId, setFaceId] = useState(false);
  const [fingerprint, setFingerprint] = useState(false);
  const [voiceAuth, setVoiceAuth] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState<string | null>(null);
  const [showBiometricModal, setShowBiometricModal] = useState<{ type: string; label: string } | null>(null);
  
  // Face recognition camera states
  const [showFaceScanModal, setShowFaceScanModal] = useState<{ mode: 'activate' | 'deactivate'; type: string } | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [faceScanProgress, setFaceScanProgress] = useState(0);
  const [faceScanStatus, setFaceScanStatus] = useState<'scanning' | 'success' | 'error' | 'idle'>('idle');
  const [faceDetectionMessage, setFaceDetectionMessage] = useState<string>('');
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Google Authenticator states
  const [google2faEnabled, setGoogle2faEnabled] = useState(false);
  const [google2faLoading, setGoogle2faLoading] = useState(true);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDisableModal, setShowDisableModal] = useState(false);
  const [setupData, setSetupData] = useState<{ secret: string; otpAuthUri: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);
  const [secretCopied, setSecretCopied] = useState(false);
  const [setupStep, setSetupStep] = useState<"qr" | "verify">("qr");

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  const fetch2faStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/2fa/status");
      if (res.ok) {
        const data = await res.json();
        setGoogle2faEnabled(data.enabled);
      }
    } catch {
      // silently fail
    } finally {
      setGoogle2faLoading(false);
    }
  }, []);

  const handleDeleteSession = async (sessionId: string) => {
    if (!window.confirm("Voulez-vous vraiment deconnecter cet appareil ?")) return;
    setDeletingSessionId(sessionId);
    try {
      const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        toast.success("Session revoquee avec succes");
      } else {
        toast.error("Erreur lors de la revocation");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setDeletingSessionId(null);
    }
  };

  const handleSetup2fa = async () => {
    setSetupLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/setup", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSetupData(data);
        setSetupStep("qr");
        setVerifyCode("");
        setShowSetupModal(true);
      } else {
        const data = await res.json();
        toast.error(data.error || "Erreur lors de l'initialisation");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerify2fa = async () => {
    if (verifyCode.length !== 6) {
      toast.error("Entrez un code a 6 chiffres");
      return;
    }
    setVerifyLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: verifyCode }),
      });
      if (res.ok) {
        setGoogle2faEnabled(true);
        setShowSetupModal(false);
        setSetupData(null);
        setVerifyCode("");
        toast.success("Google Authenticator active avec succes");
      } else {
        const data = await res.json();
        toast.error(data.error || "Code incorrect");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleDisable2fa = async () => {
    if (disableCode.length !== 6) {
      toast.error("Entrez un code a 6 chiffres");
      return;
    }
    setDisableLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: disableCode }),
      });
      if (res.ok) {
        setGoogle2faEnabled(false);
        setShowDisableModal(false);
        setDisableCode("");
        toast.success("Google Authenticator desactive");
      } else {
        const data = await res.json();
        toast.error(data.error || "Code incorrect");
      }
    } catch {
      toast.error("Une erreur est survenue");
    } finally {
      setDisableLoading(false);
    }
  };

  const copySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setSecretCopied(true);
      setTimeout(() => setSecretCopied(false), 2000);
    }
  };

  // Load face-api.js models
  const loadFaceApiModels = async () => {
    if (modelsLoaded) return true;
    
    setIsLoadingModels(true);
    try {
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODELS_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODELS_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODELS_URL),
      ]);
      setModelsLoaded(true);
      setIsLoadingModels(false);
      return true;
    } catch (error) {
      console.error("Error loading face-api models:", error);
      setIsLoadingModels(false);
      toast.error("Erreur de chargement des modeles de reconnaissance faciale");
      return false;
    }
  };

  // Get stored face descriptor
  const getStoredFaceDescriptor = (): Float32Array | null => {
    try {
      const stored = localStorage.getItem(FACE_DESCRIPTOR_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return new Float32Array(parsed);
      }
      return null;
    } catch {
      return null;
    }
  };

  // Store face descriptor
  const storeFaceDescriptor = (descriptor: Float32Array): void => {
    const array = Array.from(descriptor);
    localStorage.setItem(FACE_DESCRIPTOR_STORAGE_KEY, JSON.stringify(array));
  };

  // Clear stored face descriptor
  const clearFaceDescriptor = (): void => {
    localStorage.removeItem(FACE_DESCRIPTOR_STORAGE_KEY);
  };

  // Check if face data is registered
  const hasFaceRegistered = (): boolean => {
    return getStoredFaceDescriptor() !== null;
  };

  // Start camera for face recognition
  const startFaceCamera = async () => {
    try {
      // First load models
      const modelsReady = await loadFaceApiModels();
      if (!modelsReady) {
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } }
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      return true;
    } catch (error) {
      console.error("Camera error:", error);
      toast.error("Impossible d'acceder a la camera");
      return false;
    }
  };

  // Stop camera
  const stopFaceCamera = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setFaceScanProgress(0);
    setFaceScanStatus('idle');
    setFaceDetectionMessage('');
  };

  // Real face scanning process with face-api.js
  const performFaceScan = async (): Promise<boolean> => {
    if (!videoRef.current || !modelsLoaded) {
      toast.error("La camera ou les modeles ne sont pas prets");
      return false;
    }

    setFaceScanStatus('scanning');
    setFaceScanProgress(0);
    setFaceDetectionMessage('Analyse du visage en cours...');

    const video = videoRef.current;
    const mode = showFaceScanModal?.mode;
    
    let attempts = 0;
    const maxAttempts = 20;
    let detectedDescriptor: Float32Array | null = null;

    // Animate progress while scanning
    const progressInterval = setInterval(() => {
      setFaceScanProgress(prev => Math.min(prev + 3, 90));
    }, 150);

    try {
      // Try to detect face multiple times
      while (attempts < maxAttempts && !detectedDescriptor) {
        attempts++;
        setFaceDetectionMessage(`Recherche du visage... (${attempts}/${maxAttempts})`);

        const detections = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.5 }))
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (detections) {
          detectedDescriptor = detections.descriptor;
          setFaceDetectionMessage('Visage detecte!');
          break;
        }

        await new Promise(resolve => setTimeout(resolve, 300));
      }

      clearInterval(progressInterval);

      if (!detectedDescriptor) {
        setFaceScanProgress(0);
        setFaceScanStatus('error');
        setFaceDetectionMessage('Aucun visage detecte. Positionnez votre visage dans le cercle.');
        return false;
      }

      // Mode: Activation - Store the face descriptor
      if (mode === 'activate') {
        setFaceScanProgress(100);
        setFaceDetectionMessage('Enregistrement du visage...');
        
        // Store face descriptor
        storeFaceDescriptor(detectedDescriptor);
        
        await new Promise(resolve => setTimeout(resolve, 500));
        setFaceScanStatus('success');
        setFaceDetectionMessage('Visage enregistre avec succes!');
        return true;
      }
      
      // Mode: Deactivation or Verification - Compare with stored face
      if (mode === 'deactivate') {
        const storedDescriptor = getStoredFaceDescriptor();
        
        if (!storedDescriptor) {
          setFaceScanStatus('error');
          setFaceDetectionMessage('Aucun visage enregistre trouve.');
          return false;
        }

        setFaceDetectionMessage('Verification du visage...');
        setFaceScanProgress(95);

        // Compare face descriptors using Euclidean distance
        const distance = faceapi.euclideanDistance(detectedDescriptor, storedDescriptor);
        
        if (distance < FACE_MATCH_THRESHOLD) {
          // Face matches - allow deactivation
          setFaceScanProgress(100);
          setFaceScanStatus('success');
          setFaceDetectionMessage('Visage verifie! Desactivation autorisee.');
          clearFaceDescriptor();
          return true;
        } else {
          setFaceScanStatus('error');
          setFaceDetectionMessage('Visage non reconnu. Ce n\'est pas le visage enregistre.');
          return false;
        }
      }

      return false;
    } catch (error) {
      clearInterval(progressInterval);
      console.error("Face detection error:", error);
      setFaceScanStatus('error');
      setFaceDetectionMessage('Erreur lors de la detection du visage.');
      return false;
    }
  };

  // Handle face scan modal
  const handleFaceScanComplete = async () => {
    if (!showFaceScanModal) return;
    
    const success = await performFaceScan();
    
    if (success) {
      if (showFaceScanModal.mode === 'activate') {
        setFaceId(true);
        localStorage.setItem('faceId', 'true');
        toast.success('Reconnaissance Faciale activee avec succes');
      } else {
        setFaceId(false);
        localStorage.setItem('faceId', 'false');
        toast.success('Reconnaissance Faciale desactivee');
      }
      stopFaceCamera();
      setShowFaceScanModal(null);
    } else {
      toast.error('Echec de la verification faciale. Reessayez.');
      setFaceScanStatus('idle');
    }
  };

  // Close face scan modal
  const closeFaceScanModal = () => {
    stopFaceCamera();
    setShowFaceScanModal(null);
  };

  // Function to request biometric permission
  const requestBiometricPermission = async (type: string): Promise<boolean> => {
    // Check if WebAuthn is supported
    if (!window.PublicKeyCredential) {
      toast.error("La biometrie n'est pas supportee sur cet appareil");
      return false;
    }

    try {
      // Check if platform authenticator is available
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (!available) {
        toast.error("Aucun capteur biometrique detecte sur cet appareil");
        return false;
      }

      // Create a credential challenge for biometric verification
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: {
          name: "PimPay",
          id: window.location.hostname,
        },
        user: {
          id: new Uint8Array(16),
          name: "user@pimpay.com",
          displayName: "Utilisateur PimPay",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        timeout: 60000,
        attestation: "none",
      };

      // This will trigger the biometric prompt
      await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions,
      });

      return true;
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === "NotAllowedError") {
          toast.error("Autorisation biometrique refusee");
        } else if (error.name === "InvalidStateError") {
          // Credential already exists, try to get it instead
          return true;
        } else {
          toast.error("Erreur lors de la verification biometrique");
        }
      }
      return false;
    }
  };

  // Handle biometric toggle with permission request
  const handleBiometricToggle = async (type: string, currentValue: boolean, setValue: (v: boolean) => void) => {
    // Special handling for face recognition - use camera
    if (type === 'faceId') {
      if (currentValue) {
        // Deactivation - need to verify face first
        setShowFaceScanModal({ mode: 'deactivate', type });
        const cameraStarted = await startFaceCamera();
        if (!cameraStarted) {
          setShowFaceScanModal(null);
        }
      } else {
        // Activation - open camera to register face
        setShowFaceScanModal({ mode: 'activate', type });
        const cameraStarted = await startFaceCamera();
        if (!cameraStarted) {
          setShowFaceScanModal(null);
        }
      }
      return;
    }
    
    // Handle fingerprint and other biometrics
    if (currentValue) {
      // Deactivation - verify biometric first before allowing deactivation
      setBiometricLoading(type);
      const verified = await requestBiometricPermission(type);
      setBiometricLoading(null);
      
      if (verified) {
        setValue(false);
        localStorage.setItem(type, "false");
        toast.success(`${type === "fingerprint" ? "Empreinte Digitale" : type === "voiceAuth" ? "Verification Vocale" : "Biometrie"} desactivee`);
      } else {
        toast.error("Verification echouee. Impossible de desactiver.");
      }
    } else {
      // Activation - request biometric permission first
      setBiometricLoading(type);
      const granted = await requestBiometricPermission(type);
      setBiometricLoading(null);
      
      if (granted) {
        setValue(true);
        localStorage.setItem(type, "true");
        toast.success(`${type === "fingerprint" ? "Empreinte Digitale" : type === "voiceAuth" ? "Verification Vocale" : "Biometrie"} activee avec succes`);
      }
    }
  };

  useEffect(() => {
    setMounted(true);
    setOtpEmail(localStorage.getItem("otpEmail") === "true");
    setOtpSms(localStorage.getItem("otpSms") === "true");
    setBiometric(localStorage.getItem("biometric") === "true");
    // Sync faceId state with actual stored face data
    const storedFaceId = localStorage.getItem("faceId") === "true";
    const storedDescriptor = localStorage.getItem(FACE_DESCRIPTOR_STORAGE_KEY);
    const hasFaceData = storedDescriptor !== null;
    // Only enable faceId if there's actual face data stored
    if (storedFaceId && !hasFaceData) {
      localStorage.setItem("faceId", "false");
      setFaceId(false);
    } else {
      setFaceId(storedFaceId && hasFaceData);
    }
    setFingerprint(localStorage.getItem("fingerprint") === "true");
    setVoiceAuth(localStorage.getItem("voiceAuth") === "true");
    fetchSessions();
    fetch2faStatus();
  }, [fetchSessions, fetch2faStatus]);

  const toggleSwitch = (key: string, value: boolean, setValue: (v: boolean) => void) => {
    const newVal = !value;
    if (!newVal) {
      if (!window.confirm(`Desactiver cette protection reduira la securite de votre protocole Pimpay. Continuer ?`)) return;
    }
    setValue(newVal);
    localStorage.setItem(key, newVal.toString());
    toast.success(`${key.replace('otp', 'OTP ')} ${newVal ? 'active' : 'desactive'}`);
  };

  if (!mounted) return null;

  const securityScore = [otpEmail, otpSms, biometric, google2faEnabled, faceId, fingerprint, voiceAuth].filter(Boolean).length;
  const scorePercentage = Math.round((securityScore / 7) * 100);

  const getDeviceIcon = (session: SessionData) => {
    const type = session.deviceType?.toLowerCase();
    if (type === "tablet") return <Tablet size={22} />;
    if (session.isMobile) return <Smartphone size={22} />;
    return <Monitor size={22} />;
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white pb-32 selection:bg-blue-500/30">
      
      {/* TOP HEADER - STICKY */}
      <div className="sticky top-0 z-50 px-6 pt-12 pb-4 bg-[#020617]/80 backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 active:scale-90 transition-all hover:bg-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-black uppercase tracking-tighter leading-none">Centre de Securite</h1>
            <p className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.3em] mt-1">Pimpay Protocol v4.0</p>
          </div>
        </div>
      </div>

      <div className="px-6 space-y-8 mt-4">
        
        {/* DYNAMIC SECURITY SCORE CARD */}
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-900/60 to-slate-900/20 border border-white/5 p-7 rounded-[2.5rem] shadow-2xl">
          <div className="absolute top-0 right-0 -mr-4 -mt-4 p-6 opacity-[0.03] rotate-12">
            <Shield size={160} className="text-white" />
          </div>

          <div className="relative z-10 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-black text-blue-500 tracking-[0.2em]">{"Etat du Protocole"}</span>
              <h3 className={`text-2xl font-black uppercase tracking-tighter ${securityScore === 4 ? "text-emerald-400" : "text-white"}`}>
                {securityScore === 4 ? "Protection Maximale" : securityScore === 0 ? "Alerte Critique" : "Niveau Standard"}
              </h3>
            </div>
            <div className={`h-14 w-14 rounded-2xl border flex items-center justify-center transition-all duration-500 ${securityScore === 4 ? 'border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_20px_rgba(16,185,129,0.2)]' : 'border-blue-500/20 bg-blue-500/5'}`}>
              {securityScore === 4 ? <ShieldCheck className="text-emerald-500" size={28} /> : <ShieldAlert className="text-blue-500" size={28} />}
            </div>
          </div>

          <div className="mt-8 space-y-3">
            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-slate-500">
                <span>{"Fiabilite de l'acces"}</span>
                <span className={securityScore === 4 ? "text-emerald-500" : "text-blue-500"}>{scorePercentage}%</span>
            </div>
            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                <div
                className={`h-full transition-all duration-1000 ease-in-out rounded-full ${securityScore === 4 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                style={{ width: `${scorePercentage}%` }}
                />
            </div>
          </div>
        </div>

        {/* 2FA SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-5 ml-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">Double Authentification (2FA)</h3>
          </div>
          <div className="grid gap-3">
            {/* Email 2FA */}
            <button
              onClick={() => {
                if (otpEmail) {
                  if (!window.confirm("Desactiver la protection email reduira la securite de votre compte. Continuer ?")) return;
                  setOtpEmail(false);
                  localStorage.setItem("otpEmail", "false");
                  toast.success("Protection Email desactivee");
                } else {
                  setEmailCode("");
                  setEmailCodeSent(false);
                  setShowEmail2faModal(true);
                }
              }}
              className="w-full flex items-center justify-between p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5 hover:border-blue-500/20 active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl transition-all duration-500 ${otpEmail ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
                  <Mail size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">Protection Email</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                    {otpEmail ? "Verification active par email" : "Validation de session par code"}
                  </p>
                </div>
              </div>
              <div className={`w-12 h-6.5 rounded-full p-1 flex items-center transition-all duration-500 ${otpEmail ? "bg-blue-600" : "bg-slate-800"}`}>
                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-xl transform transition-all duration-500 ease-in-out ${otpEmail ? "translate-x-5.5" : "translate-x-0"}`} />
              </div>
            </button>

            {/* SMS 2FA */}
            <button
              onClick={() => {
                if (otpSms) {
                  if (!window.confirm("Desactiver la validation SMS reduira la securite de votre compte. Continuer ?")) return;
                  setOtpSms(false);
                  localStorage.setItem("otpSms", "false");
                  toast.success("Validation SMS desactivee");
                } else {
                  setSmsCode("");
                  setSmsCodeSent(false);
                  setShowSms2faModal(true);
                }
              }}
              className="w-full flex items-center justify-between p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5 hover:border-blue-500/20 active:scale-[0.98] transition-all group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl transition-all duration-500 ${otpSms ? 'bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
                  <MessageCircle size={20} />
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">Validation SMS</p>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                    {otpSms ? "OTP via Mobile Money active" : "OTP via Mobile Money"}
                  </p>
                </div>
              </div>
              <div className={`w-12 h-6.5 rounded-full p-1 flex items-center transition-all duration-500 ${otpSms ? "bg-emerald-600" : "bg-slate-800"}`}>
                <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-xl transform transition-all duration-500 ease-in-out ${otpSms ? "translate-x-5.5" : "translate-x-0"}`} />
              </div>
            </button>

            {/* Google Authenticator */}
            {google2faLoading ? (
              <div className="flex items-center justify-center p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5">
                <Loader2 size={16} className="animate-spin text-blue-500" />
                <span className="ml-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Chargement...</span>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (google2faEnabled) {
                    setDisableCode("");
                    setShowDisableModal(true);
                  } else {
                    handleSetup2fa();
                  }
                }}
                disabled={setupLoading}
                className="w-full flex items-center justify-between p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5 hover:border-blue-500/20 active:scale-[0.98] transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className={`p-3.5 rounded-2xl transition-all duration-500 ${google2faEnabled ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
                    {setupLoading ? <Loader2 size={20} className="animate-spin" /> : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" fill="currentColor" opacity="0.3"/>
                        <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M17 12a5 5 0 11-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">Google Authenticator</p>
                    <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
                      {google2faEnabled ? "Protection TOTP active" : "Code temporaire a 6 chiffres"}
                    </p>
                  </div>
                </div>

                <div className={`w-12 h-6.5 rounded-full p-1 flex items-center transition-all duration-500 ${google2faEnabled ? "bg-blue-600" : "bg-slate-800"}`}>
                  <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-xl transform transition-all duration-500 ease-in-out ${google2faEnabled ? "translate-x-5.5" : "translate-x-0"}`} />
                </div>
              </button>
            )}
          </div>
        </section>

        {/* KEYS SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-5 ml-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{"Cles & Chiffrement"}</h3>
          </div>
          <div className="bg-slate-900/40 border border-white/5 rounded-[2.5rem] overflow-hidden">
            <SecurityAction
              icon={<Lock size={20} />}
              label="Mot de passe Maitre"
              description="Derniere modification : Il y a 3 mois"
              path="/settings/security/change-password"
            />
            <div className="h-[1px] w-[90%] bg-white/5 mx-auto" />
            <SecurityAction
              icon={<KeyRound size={20} />}
              label="Code PIN Transactionnel"
              description="Requis pour chaque retrait"
              path="/settings/security/pin"
            />
          </div>
        </section>

        {/* SESSIONS SECTION */}
        <section>
          <div className="flex items-center gap-2 mb-5 ml-2">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">
              Sessions Actives
              {!loadingSessions && sessions.length > 0 && (
                <span className="ml-2 text-emerald-500">{sessions.length}</span>
              )}
            </h3>
          </div>

          {loadingSessions ? (
            <div className="flex items-center justify-center p-8 rounded-[2rem] bg-slate-900/40 border border-white/5">
              <Loader2 size={20} className="animate-spin text-blue-500" />
              <span className="ml-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Chargement des sessions...
              </span>
            </div>
          ) : sessions.length === 0 ? (
            <div className="p-8 text-center rounded-[2rem] bg-slate-900/40 border border-dashed border-white/10">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                Aucune session active
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const isExpanded = expandedSessionId === session.id;

                return (
                  <div
                    key={session.id}
                    className={`rounded-[2rem] transition-all overflow-hidden ${
                      session.isCurrent
                        ? "bg-slate-900/40 border border-emerald-500/10"
                        : "bg-slate-900/20 border border-white/5 opacity-80"
                    }`}
                  >
                    {/* Session header */}
                    <div className="flex items-center justify-between p-5">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div
                          className={`p-3.5 rounded-2xl shrink-0 ${
                            session.isCurrent
                              ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/10"
                              : "bg-slate-800 text-slate-400"
                          }`}
                        >
                          {getDeviceIcon(session)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-black uppercase tracking-tight truncate">
                            {session.deviceName}
                          </p>
                          {session.isCurrent ? (
                            <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest">
                              {"Actuel"}
                              {session.country ? ` \u2022 ${session.city ? `${session.city}, ` : ""}${session.country}` : ""}
                            </p>
                          ) : (
                            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                              {formatDistanceToNow(new Date(session.lastActiveAt), {
                                addSuffix: true,
                                locale: fr,
                              })}
                              {session.country ? ` \u2022 ${session.city ? `${session.city}, ` : ""}${session.country}` : ""}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {session.isCurrent ? (
                          <div className="px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                            <span className="text-[8px] font-black text-emerald-500 uppercase">
                              En ligne
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSession(session.id);
                            }}
                            disabled={deletingSessionId === session.id}
                            className="p-3 text-rose-500 bg-rose-500/5 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-90 disabled:opacity-50"
                          >
                            <Trash2
                              size={18}
                              className={deletingSessionId === session.id ? "animate-pulse" : ""}
                            />
                          </button>
                        )}

                        {/* Expand/collapse button */}
                        <button
                          onClick={() => setExpandedSessionId(isExpanded ? null : session.id)}
                          className="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-500/5 rounded-xl transition-all"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded system info */}
                    {isExpanded && (
                      <div className="px-5 pb-5 pt-0">
                        <div className="bg-slate-950/60 border border-white/5 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-3">
                            <Cpu size={12} className="text-blue-500" />
                            <span className="text-[9px] font-black text-blue-500 uppercase tracking-[0.15em]">
                              Informations Systeme
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            {/* OS */}
                            <SystemInfoItem
                              label="Systeme"
                              value={session.os || "Inconnu"}
                              icon={<Monitor size={12} />}
                            />
                            {/* Browser */}
                            <SystemInfoItem
                              label="Navigateur"
                              value={`${session.browser}${session.browserVersion ? ` ${session.browserVersion}` : ""}`}
                              icon={<Globe size={12} />}
                            />
                            {/* Device */}
                            <SystemInfoItem
                              label="Appareil"
                              value={
                                session.deviceVendor || session.deviceModel
                                  ? `${session.deviceVendor || ""} ${session.deviceModel || ""}`.trim()
                                  : session.isMobile ? "Mobile" : "Desktop"
                              }
                              icon={session.isMobile ? <Smartphone size={12} /> : <Monitor size={12} />}
                            />
                            {/* Type */}
                            <SystemInfoItem
                              label="Type"
                              value={
                                session.deviceType === "mobile" ? "Mobile"
                                : session.deviceType === "tablet" ? "Tablette"
                                : "Ordinateur"
                              }
                              icon={getDeviceIcon(session)}
                            />
                            {/* IP */}
                            <SystemInfoItem
                              label="Adresse IP"
                              value={session.ip}
                              icon={<Wifi size={12} />}
                            />
                            {/* Engine */}
                            {session.engineName && (
                              <SystemInfoItem
                                label="Moteur"
                                value={session.engineName}
                                icon={<Cpu size={12} />}
                              />
                            )}
                            {/* CPU Architecture */}
                            {session.cpuArch && (
                              <SystemInfoItem
                                label="Architecture"
                                value={session.cpuArch}
                                icon={<Cpu size={12} />}
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* BIOMETRY SECTION */}
        <section className="pb-12">
          <div className="flex items-center gap-2 mb-5 ml-2">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <h3 className="text-[10px] uppercase font-black text-slate-500 tracking-[0.2em]">{"Acces Biometrique"}</h3>
          </div>
          <div className="grid gap-3">
            <BiometricToggle
              icon={<Fingerprint size={20} />}
              label="Biometrie Native"
              description="Touch ID / Face ID"
              value={biometric}
              loading={biometricLoading === "biometric"}
              onToggle={() => handleBiometricToggle("biometric", biometric, setBiometric)}
            />
            <BiometricToggle
              icon={<Scan size={20} />}
              label="Reconnaissance Faciale"
              description="Deverrouillage par visage"
              value={faceId}
              loading={biometricLoading === "faceId"}
              onToggle={() => handleBiometricToggle("faceId", faceId, setFaceId)}
            />
            <BiometricToggle
              icon={<Eye size={20} />}
              label="Empreinte Digitale"
              description="Capteur biometrique avance"
              value={fingerprint}
              loading={biometricLoading === "fingerprint"}
              onToggle={() => handleBiometricToggle("fingerprint", fingerprint, setFingerprint)}
            />
            <BiometricToggle
              icon={<Mic size={20} />}
              label="Verification Vocale"
              description="Empreinte vocale unique"
              value={voiceAuth}
              loading={biometricLoading === "voiceAuth"}
              onToggle={() => handleBiometricToggle("voiceAuth", voiceAuth, setVoiceAuth)}
            />
          </div>
        </section>
      </div>

      {/* GOOGLE AUTHENTICATOR SETUP MODAL */}
      {showSetupModal && setupData && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Google Authenticator</h2>
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.2em] mt-1">Configuration TOTP</p>
              </div>
              <button
                onClick={() => {
                  setShowSetupModal(false);
                  setSetupData(null);
                  setVerifyCode("");
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            {setupStep === "qr" ? (
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-5">
                    Scannez ce QR code avec Google Authenticator
                  </p>
                  <div className="inline-flex p-4 bg-white rounded-2xl">
                    <QRCodeSVG
                      value={setupData.otpAuthUri}
                      size={180}
                      level="M"
                      bgColor="#ffffff"
                      fgColor="#000000"
                    />
                  </div>
                </div>

                {/* Secret key for manual entry */}
                <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4">
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mb-2">
                    {"Cle secrete (saisie manuelle)"}
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs font-mono text-blue-400 bg-slate-950 rounded-xl px-3 py-2.5 break-all select-all">
                      {setupData.secret}
                    </code>
                    <button
                      onClick={copySecret}
                      className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90 shrink-0"
                    >
                      {secretCopied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} className="text-slate-400" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setSetupStep("verify")}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-sm tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                >
                  Continuer
                </button>
              </div>
            ) : (
              <div className="p-6 space-y-6">
                <div className="text-center">
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-2">
                    Entrez le code affiche dans Google Authenticator
                  </p>
                </div>

                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="w-full text-center text-3xl font-black tracking-[0.5em] bg-slate-900/60 border border-white/10 rounded-2xl py-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setSetupStep("qr")}
                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                  >
                    Retour
                  </button>
                  <button
                    onClick={handleVerify2fa}
                    disabled={verifyLoading || verifyCode.length !== 6}
                    className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                  >
                    {verifyLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                    Activer
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DISABLE 2FA MODAL */}
      {showDisableModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Desactiver 2FA</h2>
                <p className="text-[9px] text-rose-500 font-bold uppercase tracking-[0.2em] mt-1">Cela reduira votre securite</p>
              </div>
              <button
                onClick={() => {
                  setShowDisableModal(false);
                  setDisableCode("");
                }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center">
                Entrez le code Google Authenticator pour confirmer
              </p>

              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="000000"
                className="w-full text-center text-3xl font-black tracking-[0.5em] bg-slate-900/60 border border-white/10 rounded-2xl py-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDisableModal(false);
                    setDisableCode("");
                  }}
                  className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                >
                  Annuler
                </button>
                <button
                  onClick={handleDisable2fa}
                  disabled={disableLoading || disableCode.length !== 6}
                  className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {disableLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Desactiver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EMAIL 2FA ACTIVATION MODAL */}
      {showEmail2faModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Protection Email</h2>
                <p className="text-[9px] text-blue-500 font-bold uppercase tracking-[0.2em] mt-1">Activation 2FA par Email</p>
              </div>
              <button
                onClick={() => setShowEmail2faModal(false)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-blue-500/5 border border-blue-500/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-600 rounded-xl shrink-0">
                  <Mail size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Comment ca marche</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    Un code de verification sera envoye a votre adresse email a chaque nouvelle connexion.
                  </p>
                </div>
              </div>

              {!emailCodeSent ? (
                <button
                  onClick={async () => {
                    setEmailLoading(true);
                    await new Promise(r => setTimeout(r, 1500));
                    setEmailCodeSent(true);
                    setEmailLoading(false);
                    toast.success("Code envoye a votre adresse email");
                  }}
                  disabled={emailLoading}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase text-sm tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {emailLoading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
                  Envoyer le code de verification
                </button>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-4">
                      Entrez le code recu par email
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={emailCode}
                      onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full text-center text-3xl font-black tracking-[0.5em] bg-slate-900/60 border border-white/10 rounded-2xl py-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowEmail2faModal(false)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        if (emailCode.length !== 6) { toast.error("Entrez un code a 6 chiffres"); return; }
                        setEmailLoading(true);
                        await new Promise(r => setTimeout(r, 1000));
                        setOtpEmail(true);
                        localStorage.setItem("otpEmail", "true");
                        setShowEmail2faModal(false);
                        setEmailLoading(false);
                        toast.success("Protection Email activee avec succes");
                      }}
                      disabled={emailLoading || emailCode.length !== 6}
                      className="flex-1 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {emailLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                      Activer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SMS 2FA ACTIVATION MODAL */}
      {showSms2faModal && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center justify-between p-6 pb-0">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-white">Validation SMS</h2>
                <p className="text-[9px] text-emerald-500 font-bold uppercase tracking-[0.2em] mt-1">Activation OTP Mobile</p>
              </div>
              <button
                onClick={() => setShowSms2faModal(false)}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all active:scale-90"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-2xl p-4 flex items-center gap-4">
                <div className="p-3 bg-emerald-600 rounded-xl shrink-0">
                  <MessageCircle size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Verification Mobile</p>
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    Un code OTP sera envoye par SMS a votre numero Mobile Money pour chaque transaction sensible.
                  </p>
                </div>
              </div>

              {!smsCodeSent ? (
                <button
                  onClick={async () => {
                    setSmsLoading(true);
                    await new Promise(r => setTimeout(r, 1500));
                    setSmsCodeSent(true);
                    setSmsLoading(false);
                    toast.success("Code OTP envoye par SMS");
                  }}
                  disabled={smsLoading}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black uppercase text-sm tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  {smsLoading ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />}
                  Envoyer le code SMS
                </button>
              ) : (
                <>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest text-center mb-4">
                      Entrez le code recu par SMS
                    </p>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={smsCode}
                      onChange={(e) => setSmsCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      className="w-full text-center text-3xl font-black tracking-[0.5em] bg-slate-900/60 border border-white/10 rounded-2xl py-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 transition-all"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowSms2faModal(false)}
                      className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98]"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={async () => {
                        if (smsCode.length !== 6) { toast.error("Entrez un code a 6 chiffres"); return; }
                        setSmsLoading(true);
                        await new Promise(r => setTimeout(r, 1000));
                        setOtpSms(true);
                        localStorage.setItem("otpSms", "true");
                        setShowSms2faModal(false);
                        setSmsLoading(false);
                        toast.success("Validation SMS activee avec succes");
                      }}
                      disabled={smsLoading || smsCode.length !== 6}
                      className="flex-1 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black uppercase text-xs tracking-widest rounded-2xl transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                      {smsLoading ? <Loader2 size={16} className="animate-spin" /> : null}
                      Activer
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Face Recognition Camera Modal */}
      {showFaceScanModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-[2.5rem] overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-2xl ${showFaceScanModal.mode === 'activate' ? 'bg-blue-500/10 text-blue-400' : 'bg-red-500/10 text-red-400'}`}>
                  <Scan size={20} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight">
                    {showFaceScanModal.mode === 'activate' ? 'Activer Reconnaissance Faciale' : 'Verification Faciale'}
                  </h3>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                    {showFaceScanModal.mode === 'activate' ? 'Enregistrez votre visage' : 'Verifiez votre identite'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeFaceScanModal}
                className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Camera View */}
            <div className="px-6 py-6">
              <div className="relative w-full aspect-square bg-slate-900 rounded-3xl overflow-hidden border border-white/10">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover scale-x-[-1]"
                />
                <canvas 
                  ref={canvasRef} 
                  className="absolute inset-0 w-full h-full pointer-events-none"
                />
                
                {/* Face Guide Circle with Progress Ring */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  {/* Perfect Circle Container */}
                  <div className="relative w-52 h-52">
                    {/* SVG Progress Ring */}
                    <svg 
                      className="absolute inset-0 w-full h-full -rotate-90"
                      viewBox="0 0 208 208"
                    >
                      {/* Background Circle */}
                      <circle
                        cx="104"
                        cy="104"
                        r="100"
                        fill="none"
                        stroke={
                          faceScanStatus === 'success' ? 'rgba(16, 185, 129, 0.2)' :
                          faceScanStatus === 'error' ? 'rgba(239, 68, 68, 0.2)' :
                          'rgba(255, 255, 255, 0.1)'
                        }
                        strokeWidth="4"
                      />
                      {/* Progress Circle */}
                      <circle
                        cx="104"
                        cy="104"
                        r="100"
                        fill="none"
                        stroke={
                          faceScanStatus === 'success' ? '#10B981' :
                          faceScanStatus === 'error' ? '#EF4444' :
                          faceScanStatus === 'scanning' ? '#22C55E' :
                          'rgba(255, 255, 255, 0.3)'
                        }
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 100}`}
                        strokeDashoffset={`${2 * Math.PI * 100 * (1 - faceScanProgress / 100)}`}
                        className="transition-all duration-300 ease-out"
                        style={{
                          filter: faceScanStatus === 'scanning' ? 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.6))' :
                                  faceScanStatus === 'success' ? 'drop-shadow(0 0 15px rgba(16, 185, 129, 0.8))' :
                                  faceScanStatus === 'error' ? 'drop-shadow(0 0 15px rgba(239, 68, 68, 0.8))' :
                                  'none'
                        }}
                      />
                    </svg>
                    
                    {/* Inner Circle Guide */}
                    <div className={`absolute inset-2 rounded-full border-2 border-dashed transition-all duration-500 ${
                      faceScanStatus === 'scanning' ? 'border-green-400/50 animate-pulse' :
                      faceScanStatus === 'success' ? 'border-emerald-400' :
                      faceScanStatus === 'error' ? 'border-red-400' :
                      'border-white/20'
                    }`} />
                    
                    {/* Corner Markers for alignment */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full" />
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-gradient-to-r from-transparent via-white/50 to-transparent rounded-full" />
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-gradient-to-b from-transparent via-white/50 to-transparent rounded-full" />
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 h-8 w-1 bg-gradient-to-b from-transparent via-white/50 to-transparent rounded-full" />
                  </div>
                </div>

                {/* Scan Progress Info */}
                {(faceScanStatus === 'scanning' || isLoadingModels) && (
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-slate-900/90 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-black text-green-400 uppercase tracking-widest flex items-center gap-2">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                          {isLoadingModels ? 'Chargement IA...' : 'Scan en cours'}
                        </span>
                        <span className="text-[10px] font-bold text-white">{faceScanProgress}%</span>
                      </div>
                      <p className="text-[9px] text-slate-400 mb-2">{faceDetectionMessage}</p>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-green-500 via-emerald-500 to-cyan-500 rounded-full transition-all duration-200"
                          style={{ width: `${faceScanProgress}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Success Overlay */}
                {faceScanStatus === 'success' && (
                  <div className="absolute inset-0 bg-emerald-500/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-emerald-400 to-green-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_60px_rgba(16,185,129,0.6)] animate-in zoom-in duration-300">
                        <Check size={48} className="text-white" />
                      </div>
                      <p className="text-lg font-black text-white uppercase tracking-tight">
                        {showFaceScanModal?.mode === 'activate' ? 'Visage Enregistre' : 'Visage Verifie'}
                      </p>
                      <p className="text-[10px] text-emerald-300 mt-1">{faceDetectionMessage}</p>
                    </div>
                  </div>
                )}

                {/* Error Overlay */}
                {faceScanStatus === 'error' && (
                  <div className="absolute inset-0 bg-red-500/20 backdrop-blur-sm flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center mx-auto mb-4 shadow-[0_0_60px_rgba(239,68,68,0.6)] animate-in zoom-in duration-300">
                        <X size={48} className="text-white" />
                      </div>
                      <p className="text-lg font-black text-white uppercase tracking-tight">Echec de Verification</p>
                      <p className="text-[10px] text-red-300 mt-1 max-w-[200px] mx-auto">{faceDetectionMessage}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-5 text-center">
                <p className="text-[11px] text-slate-400 font-medium">
                  {faceScanStatus === 'idle' && 'Positionnez votre visage dans le cercle et appuyez sur Scanner'}
                  {faceScanStatus === 'scanning' && faceDetectionMessage}
                  {faceScanStatus === 'success' && 'Verification reussie!'}
                  {faceScanStatus === 'error' && 'Appuyez sur Scanner pour reessayer'}
                </p>
                {faceScanStatus === 'idle' && showFaceScanModal?.mode === 'activate' && (
                  <p className="text-[9px] text-blue-400 mt-2">Votre visage sera utilise pour securiser votre compte</p>
                )}
                {faceScanStatus === 'idle' && showFaceScanModal?.mode === 'deactivate' && (
                  <p className="text-[9px] text-orange-400 mt-2">Verifiez votre identite pour desactiver</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={closeFaceScanModal}
                disabled={faceScanStatus === 'scanning' || isLoadingModels}
                className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-white font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Annuler
              </button>
              <button
                onClick={handleFaceScanComplete}
                disabled={faceScanStatus === 'scanning' || faceScanStatus === 'success' || isLoadingModels}
                className={`flex-1 py-4 font-black uppercase text-[10px] tracking-widest rounded-2xl transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${
                  showFaceScanModal.mode === 'activate' 
                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25' 
                    : 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white shadow-lg shadow-red-500/25'
                }`}
              >
                {(faceScanStatus === 'scanning' || isLoadingModels) ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Scan size={16} />
                )}
                {isLoadingModels ? 'Chargement...' : faceScanStatus === 'scanning' ? 'Analyse...' : 'Scanner'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SystemInfoItem({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-slate-600">{icon}</span>
        <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-[11px] font-bold text-slate-300 truncate">{value}</p>
    </div>
  );
}

function SecurityToggle({ icon, label, description, value, onToggle }: { icon: React.ReactNode; label: string; description: string; value: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5 hover:border-blue-500/20 active:scale-[0.98] transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3.5 rounded-2xl transition-all duration-500 ${value ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
          {icon}
        </div>
        <div className="text-left">
          <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">{label}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{description}</p>
        </div>
      </div>

      <div className={`w-12 h-6.5 rounded-full p-1 flex items-center transition-all duration-500 ${value ? "bg-blue-600" : "bg-slate-800"}`}>
        <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-xl transform transition-all duration-500 ease-in-out ${value ? "translate-x-5.5" : "translate-x-0"}`} />
      </div>
    </button>
  );
}

function BiometricToggle({ icon, label, description, value, loading, onToggle }: { icon: React.ReactNode; label: string; description: string; value: boolean; loading: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      disabled={loading}
      className="w-full flex items-center justify-between p-5 rounded-[2.2rem] bg-slate-900/40 border border-white/5 hover:border-blue-500/20 active:scale-[0.98] transition-all group disabled:opacity-70 disabled:cursor-not-allowed"
    >
      <div className="flex items-center gap-4">
        <div className={`p-3.5 rounded-2xl transition-all duration-500 ${value ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-slate-800 text-slate-500 border border-white/5'}`}>
          {loading ? <Loader2 size={20} className="animate-spin" /> : icon}
        </div>
        <div className="text-left">
          <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">{label}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">
            {loading ? "Verification en cours..." : description}
          </p>
        </div>
      </div>

      <div className={`w-12 h-6.5 rounded-full p-1 flex items-center transition-all duration-500 ${value ? "bg-blue-600" : "bg-slate-800"}`}>
        <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-xl transform transition-all duration-500 ease-in-out ${value ? "translate-x-5.5" : "translate-x-0"}`} />
      </div>
    </button>
  );
}

function SecurityAction({ icon, label, description, path }: { icon: React.ReactNode; label: string; description: string; path: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.push(path)}
      className="w-full flex items-center justify-between p-6 hover:bg-white/[0.02] active:bg-white/[0.05] transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="p-3.5 rounded-2xl bg-white/5 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-500/10 group-hover:border-blue-500/20 border border-transparent transition-all">
          {icon}
        </div>
        <div className="text-left">
          <p className="text-[13px] font-black uppercase tracking-tight text-white leading-none">{label}</p>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5">{description}</p>
        </div>
      </div>
      <div className="p-2 rounded-xl bg-white/5 group-hover:bg-blue-500/10 group-hover:text-blue-500 transition-all">
        <ChevronRight size={18} />
      </div>
    </button>
  );
}
