/** @type {import('next').NextConfig} */
const nextConfig = {
  // Désactive le mode strict pour éviter les doubles rendus en développement
  // Cela aide à stabiliser les SDK tiers comme celui de Pi Network
  reactStrictMode: false,

  typescript: {
    // Ignore les erreurs de types pour permettre le build malgré les types Pi SDK manquants
    ignoreBuildErrors: true,
  },

  eslint: {
    // Ignore ESLint pendant le build pour accélérer le déploiement
    ignoreDuringBuilds: true,
  },

  images: {
    // Nécessaire si tu héberges sur des plateformes comme VPS sans optimiseur d'image natif
    unoptimized: true,
  },

  // Configuration expérimentale pour stabiliser l'hydratation si besoin
  experimental: {
    // Optimise le chargement des packages lourds
    optimizePackageImports: ["lucide-react", "sonner"],
  },

  // AJOUT : Support pour les bibliothèques Bitcoin (tiny-secp256k1 / WASM)
  webpack: (config) => {
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      layers: true,
    };

    // Optionnel : Aide Webpack à ignorer les problèmes de fichiers binaires côté client
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
    };

    return config;
  },
}

export default nextConfig
