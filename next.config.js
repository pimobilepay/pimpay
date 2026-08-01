/** @type {import('next').NextConfig} */

// ─────────────────────────────────────────────────────────────────────────────
// CORS : origines explicitement autorisées.
//
// ⚠️ SÉCURITÉ — Avant correction : Access-Control-Allow-Origin: "*" combiné à
// Access-Control-Allow-Credentials: "true" sur /api/:path*. Cette combinaison
// est à la fois invalide (les navigateurs la rejettent) et dangereuse : elle
// annonce que n'importe quel site peut appeler l'API avec les cookies de
// session de l'utilisateur (CSRF / vol de données). L'application appelle son
// API en relatif (même origine), le wildcard n'était donc jamais nécessaire.
// ─────────────────────────────────────────────────────────────────────────────
const ALLOWED_ORIGIN =
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : null);

const corsHeaders = [
  { key: 'Access-Control-Allow-Methods', value: 'GET,DELETE,PATCH,POST,PUT' },
  {
    key: 'Access-Control-Allow-Headers',
    value:
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
  },
  { key: 'Vary', value: 'Origin' },
];

if (ALLOWED_ORIGIN) {
  corsHeaders.unshift(
    { key: 'Access-Control-Allow-Origin', value: ALLOWED_ORIGIN },
    { key: 'Access-Control-Allow-Credentials', value: 'true' },
  );
}

const nextConfig = {
  // 1. Sécurité et Stabilité
  reactStrictMode: true,

  typescript: {
    ignoreBuildErrors: true,
  },

  // Les source maps de production doublent l'empreinte mémoire du build
  // webpack (cause de l'OOM / SIGKILL sur les machines 8 Go).
  productionBrowserSourceMaps: false,

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
        source: '/api/:path*',
        headers: [
          ...corsHeaders,
          // Défense en profondeur : proxy.ts ne couvre que les pages
          // (son matcher exclut /api/*), les routes API n'avaient donc aucun
          // en-tête de durcissement.
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "default-src 'none'; frame-ancestors 'none'" },
        ],
      },
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ];
  },

  // 5. Optimisations mémoire du build
  experimental: {
    optimizePackageImports: ['lucide-react', 'sonner'],
    // Libère les caches webpack intermédiaires : indispensable avec un graphe
    // de dépendances lourd (ethers, @solana/web3.js, @stellar/stellar-sdk,
    // googleapis, firebase, face-api.js…).
    webpackMemoryOptimizations: true,
    // Compile client et serveur dans des workers séparés : le pic mémoire est
    // celui d'UNE compilation au lieu de la somme des deux.
    webpackBuildWorker: true,
  },

  // 6. Moteur Webpack (Maintenu pour la Crypto/WASM)
  webpack: (config, { isServer, dev }) => {
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

    // Le cache filesystem de webpack sérialise tout le graphe de modules en
    // mémoire avant de l'écrire : c'est le principal pic de RAM en build de
    // production. Désactivé uniquement en production (le dev garde le cache).
    if (!dev) {
      config.cache = false;
      config.devtool = false;
    }

    return config;
  },
};

module.exports = nextConfig;
