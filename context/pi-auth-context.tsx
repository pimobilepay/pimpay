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

export type LoginDTO = {
  id: string;
  username: string;
  piUserId: string;
  kycStatus: "NONE" | "PENDING" | "VERIFIED" | "REJECTED" | "APPROVED";
  walletAddress?: string;
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

// CORRECTION : Utilisation de 'any' pour éviter l'erreur de "Subsequent property declarations"
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [authMessage, setAuthMessage] = useState("Initializing Pi Network...");
  const [hasError, setHasError] = useState(false);
  const [piAccessToken, setPiAccessToken] = useState<string | null>(null);
  const [userData, setUserData] = useState<LoginDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    } catch (err: any) {
      throw new Error(`Login failed: ${err.message || "Backend unreachable"}`);
    }
  };

  const initializePiAndAuthenticate = async () => {
    setError(null);
    setHasError(false);
    setIsLoading(true);
    try {
      const parentCredentials = await requestParentCredentials();
      if (parentCredentials) {
        await authenticateAndLogin(parentCredentials.accessToken, parentCredentials.appId);
      } else {
        setAuthMessage("Loading Pi Network SDK...");
        if (typeof window.Pi === "undefined") {
          await loadPiSDK();
        }
        setAuthMessage("Authenticating...");
        await window.Pi.init({
          version: "2.0",
          sandbox: PI_NETWORK_CONFIG.SANDBOX,
        });
        const piAuthResult = await window.Pi.authenticate(["username", "payments"]);
        if (!piAuthResult.accessToken) throw new Error(DEFAULT_ERROR_MESSAGE);
        await authenticateAndLogin(piAuthResult.accessToken, null);
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
    reinitialize: initializePiAndAuthenticate,
  };

  return <PiAuthContext.Provider value={value}>{children}</PiAuthContext.Provider>;
}

export function usePiAuth() {
  const context = useContext(PiAuthContext);
  if (context === undefined) throw new Error("usePiAuth must be used within a PiAuthProvider");
  return context;
}
