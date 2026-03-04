import "@/app/globals.css";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import type { Metadata, Viewport } from "next"; 
import Script from "next/script";

import { Toaster } from "sonner";
import ClientLayout from "@/components/ClientLayout";
import GlobalAnnouncement from "@/components/GlobalAnnouncement";
import GlobalAlert from "@/components/GlobalAlert";
import { ThemeProvider } from "@/context/ThemeContext";
import { LanguageProvider } from "@/context/LanguageContext";
import { PiInitializer } from "@/components/PiInitializer";

export const viewport: Viewport = {
  themeColor: "#f8fafc",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "PimPay - Core Ledger",
  description: "The future of your Pi transactions on pimpay.pi",
  robots: "noindex, nofollow",
  icons: {
    icon: "/logo-pimpay.png",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      translate="no"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable} notranslate`}
    >
      <head>
        <meta name="google" content="notranslate" />

        {/* 1. PI NETWORK SDK - Critical loading */}
        <Script
          src="https://sdk.minepi.com/pi-sdk.js"
          strategy="beforeInteractive"
        />

        {/* Pi SDK initialization is managed by PiInitializer.tsx
            to prevent duplicate Pi.init() calls */}

        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-W8HP6W3DM4"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-W8HP6W3DM4');
          `}
        </Script>

        <script
          id="theme-strategy"
          dangerouslySetInnerHTML={{
            __html: `
              (function () {
                try {
                  const theme = localStorage.getItem("pimpay-theme") || 'light';
                  document.documentElement.classList.toggle("dark", theme === "dark");
                } catch (_) {}
              })();
            `,
          }}
        />
      </head>

      <body className="antialiased overflow-x-hidden notranslate bg-background text-foreground selection:bg-blue-500/30">
        <LanguageProvider>
          <ThemeProvider>
            <PiInitializer />

            <div id="portal-root">
              <GlobalAlert />
            </div>

            <GlobalAnnouncement />

            <ClientLayout>{children}</ClientLayout>

            <Script
              src="https://cdn.cinetpay.com/seamless/main.js"
              strategy="lazyOnload"
            />

            <Toaster
              position="top-center"
              richColors
              expand={false}
              theme="light"
              toastOptions={{
                style: {
                  borderRadius: "1rem",
                  background: "rgba(255, 255, 255, 0.9)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(0,0,0,0.1)",
                },
              }}
            />
          </ThemeProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
