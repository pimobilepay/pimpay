/**
 * Global fetch-based client for PIMPAY.
 */

type FetchResponse<T> = {
  data: T;
  status: number;
  statusText: string;
  headers: Headers;
};

export interface ApiError<T = unknown> extends Error {
  status: number;
  data: T;
}

// On initialise avec le token s'il existe déjà en mémoire locale
let authToken: string | null = typeof window !== 'undefined' ? localStorage.getItem("pimpay_auth_token") : null;

const defaultHeaders: Record<string, string> = {
  "Content-Type": "application/json",
};

const request = async <T = any>(
  url: string,
  init: RequestInit = {}
): Promise<FetchResponse<T>> => {
  const headers: Record<string, string> = {
    ...defaultHeaders,
    ...(init.headers as Record<string, string> | undefined),
  };
  
  // Correction : On ajoute "Bearer " si le token existe
  if (authToken) {
    headers["Authorization"] = authToken.startsWith("Bearer ") ? authToken : `Bearer ${authToken}`;
  }

  const response = await fetch(url, { ...init, headers });

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data =
    response.status === 204
      ? null
      : isJson
      ? await response.json()
      : await response.text();

  if (!response.ok) {
    const error = new Error(response.statusText || "Request failed") as ApiError<T>;
    error.status = response.status;
    error.data = data as T;
    throw error;
  }

  return {
    data: data as T,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  };
};

export const api = {
  get: <T = any>(url: string, init?: RequestInit) =>
    request<T>(url, { ...init, method: "GET" }),

  post: <T = any>(url: string, body?: any, init?: RequestInit) =>
    request<T>(url, {
      ...init,
      method: "POST",
      body: body === undefined ? init?.body : JSON.stringify(body),
    }),
  // ... (put, patch, delete restent identiques)
};

export const setApiAuthToken = (token: string) => {
  authToken = token;
  if (typeof window !== 'undefined') {
    localStorage.setItem("pimpay_auth_token", token);
  }
};
