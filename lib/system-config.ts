
export const PI_NETWORK_CONFIG = {
  SDK_URL: "https://sdk.minepi.com/pi-sdk.js",
  SANDBOX: false,
} as const;

export const BACKEND_CONFIG = {
  BASE_URL: "https://backend.appstudio-u7cm9zhmha0ruwv8.piappengine.com",
  BLOCKCHAIN_BASE_URL: "https://api.mainnet.minepi.com",
} as const;

export const BACKEND_URLS = {
  LOGIN: `${BACKEND_CONFIG.BASE_URL}/v1/login`,
  LOGIN_PREVIEW: `${BACKEND_CONFIG.BASE_URL}/v1/login/preview`,
  GET_PRODUCTS: (appId: string) =>
    `${BACKEND_CONFIG.BASE_URL}/v1/apps/${appId}/products`,
  GET_PAYMENT: (paymentId: string) =>
    `${BACKEND_CONFIG.BASE_URL}/proxy/v2/payments/${paymentId}`,
  APPROVE_PAYMENT: (paymentId: string) =>
    `${BACKEND_CONFIG.BASE_URL}/proxy/v2/payments/${paymentId}/approve`,
  COMPLETE_PAYMENT: (paymentId: string) =>
    `${BACKEND_CONFIG.BASE_URL}/proxy/v2/payments/${paymentId}/complete`,
} as const;

export const PI_PLATFORM_URLS = {} as const;

export const PI_BLOCKCHAIN_URLS = {
  GET_TRANSACTION: (txid: string) =>
    `${BACKEND_CONFIG.BLOCKCHAIN_BASE_URL}/transactions/${txid}/effects`,
} as const;
