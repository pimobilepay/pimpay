"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { PI_NETWORK_CONFIG, BACKEND_URLS } from "@/lib/system-config";
import { api, setApiAuthToken } from "@/lib/api";
import { useRouter } from "next/navigation";

export type LoginDTO = {
  id: string;
  username: string;
  piUserId: string;
  kycStatus: "NONE" | "PENDING" | "VERIFIED" | "REJECTED" | "APPROVED";
  walletAddress?: string;
  role?: string;
  wallets?: Array<{
    balance: number;
    currency: string;
  }>;
};

interface PiAuthResult {
  accessToken: string;
  user: {
    uid: string;
    username: string;
  };
}

declare global {
  interface Window {
    Pi: any;
  }
}

const COMMUNICATION_REQUEST_TYPE = '@pi:app:sdk:communication_information_request';
const DEFAULT_ERROR_MESSAGE = 'Failed to authenticate or login. Please refresh and try again.';

function isInIframe(): boolean {
  try {
    return window.self !== window.top;
  } catch (error) {
    return true;
  }
}

function parseJsonSafely(value: any): any {
  if (typeof value === 'string') {
    try { return JSON.parse(value); } catch { return null; }
  }
  return value;
}

interface PiAuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  authMessage: string;
  hasError: boolean;
  piAccessToken: string | null;
  userData: LoginDTO | null;
  error: string | null;
  reinitialize: () => Promise<void>;
  manualLogin: () => Promise<void>;
}

const PiAuthContext = createContext<PiAuthContextType | undefined>(undefined);

const loadPiSDK = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (document.getElementById("pi-sdk")) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.id = "pi-sdk";
    script.src = PI_NETWORK_CONFIG.SDK_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Pi SDK script"));
    document.head.appendChild(script);
  });
};

function requestParentCredentials(): Promise<{ accessToken: string; appId: string | null } | null> {
  if (!isInIframe()) return Promise.resolve(null);
  const requestId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return new Promise((resolve) => {
    const timeoutId = setTimeout(() => resolve(null), 1500);
    const messageListener = (event: MessageEvent) => {
      if (event.source !== window.parent) return;
      const data = parseJsonSafely(event.data);
      if (!data || data.type !== COMMUNICATION_REQUEST_TYPE || data.id !== requestId) return;
      clearTimeout(timeoutId);
      window.removeEventListener('message', messageListener);
      const payload = data.payload || {};
      resolve(payload.accessToken ? { accessToken: payload.accessToken, appId: payload.appId } : null);
    };
    window.addEventListener('message', messageListener);
    window.parent.postMessage(JSON.stringify({ type: COMMUNICATION_REQUEST_TYPE, id: requestId }), '*');
  });
}

export function PiAuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState("Ready");
  const [hasError, setHasError] = useState(false);
  const [piAccessToken, setPiAccessToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<LoginDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);

  const authenticateAndLogin = async (accessToken: string, appId: string | null): Promise<void> => {
    setAuthMessage("Connecting to Pimpay...");
    const endpoint = appId ? BACKEND_URLS.LOGIN_PREVIEW : BACKEND_URLS.LOGIN;
    const payload = appId ? { pi_auth_token: accessToken, app_id: appId } : { pi_auth_token: accessToken };
    
    try {
      const loginRes = await api.post<LoginDTO>(endpoint, payload);
      setPiAccessToken(accessToken);
      setApiAuthToken(accessToken);
      setUserData(loginRes.data);
      setIsAuthenticated(true);
      setHasError(false);
      
      // Créer le cookie de session
      const sessionToken = loginRes.data.id;
      document.cookie = `token=${sessionToken}; path=/; max-age=2592000; SameSite=Lax`;
      document.cookie = `pi_session_token=${sessionToken}; path=/; max-age=2592000; SameSite=Lax`;
      localStorage.setItem("pimpay_user", JSON.stringify(loginRes.data));
      
      // Redirection basée sur le rôle
      const destination = loginRes.data.role === "ADMIN" ? "/admin/dashboard" : "/dashboard";
      setTimeout(() => {
        window.location.href = destination;
      }, 500);
    } catch (err: any) {
      throw new Error(`Login failed: ${err.message || "Backend unreachable"}`);
    }
  };

  const initializePiAndAuthenticate = async () => {
    if (hasInitialized) return;
    
    setError(null);
    setHasError(false);
    setIsLoading(true);
    setHasInitialized(true);
    
    try {
      const parentCredentials = await requestParentCredentials();
      if (parentCredentials) {
        await authenticateAndLogin(parentCredentials.accessToken, parentCredentials.appId);
      } else {
        setAuthMessage("Loading Pi Network SDK...");
        if (typeof window.Pi === "undefined") {
          await loadPiSDK();
        }
        setAuthMessage("Ready for Pi Browser login");
      }
    } catch (err: any) {
      console.error("❌ Pi Auth Error:", err);
      setHasError(true);
      const msg = err.message || "An unexpected error occurred";
      setAuthMessage(msg.includes("SDK") ? "SDK Load Failed" : msg);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const manualLogin = async () => {
    setError(null);
    setHasError(false);
    setIsLoading(true);
    
    try {
      if (typeof window.Pi === "undefined") {
        await loadPiSDK();
        // Attendre que le SDK soit prêt
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      setAuthMessage("Authenticating...");
      await window.Pi.init({
        version: "2.0",
        sandbox: PI_NETWORK_CONFIG.SANDBOX,
      });
      
      const piAuthResult = await window.Pi.authenticate(["username", "payments"]);
      if (!piAuthResult.accessToken) throw new Error(DEFAULT_ERROR_MESSAGE);
      await authenticateAndLogin(piAuthResult.accessToken, null);
    } catch (err: any) {
      console.error("❌ Manual Pi Login Error:", err);
      setHasError(true);
      const msg = err.message || "An unexpected error occurred";
      setAuthMessage(msg);
      setError(msg);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    initializePiAndAuthenticate();
  }, []);

  const value = {
    isAuthenticated,
    isLoading,
    authMessage,
    hasError,
    piAccessToken,
    userData,
    error,
    reinitialize: manualLogin,
    manualLogin,
  };

  return <PiAuthContext.Provider value={value}>{children}</PiAuthContext.Provider>;
}

export function usePiAuth() {
  const context = useContext(PiAuthContext);
  if (context === undefined) throw new Error("usePiAuth must be used within a PiAuthProvider");
  return context;
}
