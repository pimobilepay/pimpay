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
  async headers() {
    return [
      {
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Credentials", value: "true" },
          { key: "Access-Control-Allow-Origin", value: "*" }, 
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "upgrade-insecure-requests" },
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
