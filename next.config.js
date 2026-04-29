/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Sécurité et Stabilité
  reactStrictMode: true,

  // 2. Gestion des Images
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "logo.clearbit.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },

  // 3. Routage
  async rewrites() {
    return [
      {
        source: "/proxy-api-pi/:path*",
        destination: "https://api.minepi.com/:path*",
      },
    ];
  },

  // 4. Headers CORS & Sécurité
  async headers() {
    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://pimpay.vercel.app";

    /**
     * SECURITY FIX [ÉLEVÉ] — Content-Security-Policy stricte
     *
     * AVANT : "upgrade-insecure-requests" seulement → aucune protection XSS.
     * APRÈS : Politique stricte avec sources explicites.
     *
     * À adapter selon vos CDN/fonts réels. En particulier :
     * - Remplacez les nonces par une génération dynamique si vous utilisez
     *   des scripts inline (voir Next.js docs sur les nonces CSP).
     * - Ajustez connect-src selon vos appels API externes réels.
     */
    const csp = [
      "default-src 'self'",
      // Scripts : 'self' + 'unsafe-eval' nécessaire pour Next.js HMR en dev
      process.env.NODE_ENV === "development"
        ? "script-src 'self' 'unsafe-eval' 'unsafe-inline'"
        : "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://logo.clearbit.com https://res.cloudinary.com",
      // Connexions API autorisées
      `connect-src 'self' https://api.minepi.com https://api.mainnet.minepi.com ${appUrl}`,
      // Iframes interdites (protection clickjacking)
      "frame-ancestors 'none'",
      // Objets (Flash etc.) interdits
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/api/:path*",
        headers: [
          /**
           * SECURITY FIX [ÉLEVÉ] — CORS
           *
           * AVANT : Access-Control-Allow-Credentials: true avec origine
           *   potentiellement trop large → risque CSRF cross-origin.
           * APRÈS : L'origine est fixée à NEXT_PUBLIC_APP_URL.
           *   Les credentials ne sont autorisés QUE pour cette origine.
           */
          {
            key: "Access-Control-Allow-Credentials",
            value: "true",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: appUrl,
          },
          {
            key: "Access-Control-Allow-Methods",
            value: "GET,DELETE,PATCH,POST,PUT,OPTIONS",
          },
          {
            key: "Access-Control-Allow-Headers",
            value:
              "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization",
          },
        ],
      },
      {
        // Headers de sécurité sur toutes les pages
        source: "/:path*",
        headers: [
          // FIX [ÉLEVÉ]: CSP stricte
          { key: "Content-Security-Policy", value: csp },
          // FIX [MOYEN]: headers manquants
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          { key: "X-XSS-Protection", value: "1; mode=block" },
        ],
      },
    ];
  },

  // 5. Optimisations
  experimental: {
    optimizePackageImports: ["lucide-react", "sonner"],
  },

  // 6. Moteur Webpack (Crypto/WASM)
  webpack: (config, { isServer }) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
      };
    }

    return config;
  },
};

module.exports = nextConfig;
