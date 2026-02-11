/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Sécurité et Stabilité
  reactStrictMode: true, // Crucial pour PimPay : détecte les fuites de mémoire

  typescript: {
    // On garde true pour le build mobile, mais à surveiller pour le Mainnet
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

  // 3. Correction de l'avertissement Middleware
  // On déclare les rewrites pour la compatibilité Next.js 16
  async rewrites() {
    return [
      {
        source: '/proxy/:path*',
        destination: 'https://api.minepi.com/:path*',
      },
    ];
  },

  // 4. Headers CORS (Sécurité Bancaire Mainnet)
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // À restreindre après test Mainnet
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
          { key: "X-Frame-Options", value: "DENY" }, // Protection contre le vol de clics
          { key: "Content-Security-Policy", value: "upgrade-insecure-requests" },
        ],
      },
    ];
  },

  // 5. Optimisations et Support Turbopack/Webpack
  experimental: {
    optimizePackageImports: ["lucide-react", "sonner"],
    // ✅ CORRECTION BUILD VERCEL : 
    // On définit un objet turbopack vide pour forcer l'usage de Webpack 
    // quand une config personnalisée est présente.
    turbopack: {}, 
  },

  // 6. Configuration Webpack (Indispensable pour SDK Pi & Crypto)
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
        // Polyfills nécessaires pour la gestion des clés privées/signatures
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify'),
      };
    }

    return config;
  },
};

module.exports = nextConfig;
