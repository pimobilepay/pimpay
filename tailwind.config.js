/** @type {import('tailwindcss').Config} */

module.exports = {
  darkMode: "class",
  content: [
    "./app/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      // 🎨 PALETTE OFFICIELLE PIMPAY
      colors: {
        // 🌤️ LIGHT MODE
        soft: "#F5F7FA",
        card: "#FFFFFF",
        textPrimary: "#1A1A1A",
        textSecondary: "#6B7280",

        // 🌙 DARK MODE
        darkBg: "#0A0D14",
        darkCard: "#11151D",
        darkPrimary: "#E5E7EB",

        // 🎛️ BRAND COLORS
        primary: "#2B63FF",     // Bleu du thème
        gold: "#F5D68A",        // Or du thème dark
        goldLight: "#FFE9B3",

        // 🧱 Bordures
        borderLight: "#E5E7EB",
        borderDark: "#1F242E",
      },

      // 🌀 Ombres premium
      boxShadow: {
        smooth: "0px 4px 20px rgba(0,0,0,0.05)",
        dark: "0px 4px 20px rgba(0,0,0,0.40)",
      },

      borderRadius: {
        card: "22px",
      },
    },
  },
  plugins: [],
};
