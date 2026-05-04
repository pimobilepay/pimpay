/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Sécurité et Stabilité
  reactStrictMode: true, 

  typescript: {
    ignoreBuildErrors: true,
  },

  // 2. Gestion des Images
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: 'logo.clearbit.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
    ],
  },

  // 3. Routage
  async rewrites() {
    return [
      {
        source: '/proxy-api-pi/:path*',
        destination: 'https://api.minepi.com/:path*',
      },
    ];
  },

  // 4. Headers CORS & Sécurité Mainnet
  // [FIX #9] La CSP est désormais générée dans proxy.ts avec un nonce par requête.
  // 'unsafe-inline' est supprimé — le nonce unique protège contre les injections XSS.
  // Les headers CORS restent ici pour les routes /api/* non couvertes par le proxy matcher.
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          // [FIX PI BROWSER] Pi Browser envoie des requêtes depuis minepi.com
          // Origin stricte bloque ces requêtes → erreur réseau côté Pi SDK
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
          // [FIX PI BROWSER] DENY bloquait Pi Browser WebView (ERR_BLOCKED_BY_RESPONSE)
          // SAMEORIGIN autorise l'embedding depuis des domaines de confiance via CSP frame-ancestors
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },

  // 5. Optimisations (On ne garde que ce qui est valide en v16)
  experimental: {
    optimizePackageImports: ["lucide-react", "sonner"],
    // On retire 'proxy' et 'turbopack' qui causent l'erreur
  },

  // 6. Moteur Webpack (Maintenu pour la Crypto/WASM)
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
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
      };
    }

    return config;
  },
};

module.exports = nextConfig;
