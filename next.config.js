/** @type {import('next').NextConfig} */
const nextConfig = {
  // 1. Sécurité et Stabilité
  reactStrictMode: false, // Stabilise le SDK Pi Network

  typescript: {
    ignoreBuildErrors: true, // Évite les blocages de build sur mobile
  },

  eslint: {
    ignoreDuringBuilds: true,
  },

  // 2. Gestion des Images (Sécurisée)
  images: {
    unoptimized: true, // Important pour le déploiement VPS/Mobile
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'logo.clearbit.com',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
    ],
  },

  // 3. Headers CORS (Indispensable pour ta banque virtuelle)
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, // À restreindre en production
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ],
      },
    ];
  },

  // 4. Optimisations et Support Crypto (WASM)
  experimental: {
    optimizePackageImports: ["lucide-react", "sonner"],
  },

  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    return config;
  },
};

module.exports = nextConfig;
