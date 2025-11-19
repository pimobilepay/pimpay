import "./globals.css";
import BottomNav from "@/components/bottom-nav";
import TopNav from "@/components/TopNav";
import { ThemeProvider } from "@/components/theme-provider";

export default function RootLayout({ children }) {
  return (
    <html 
      lang="fr" 
      className="light"
      suppressHydrationWarning
    >
      <body className="flex justify-center bg-soft dark:bg-darkBg text-textPrimary dark:text-darkPrimary">
        <ThemeProvider 
          attribute="class" 
          defaultTheme="light"
          enableSystem={false}
        >
          <div className="w-full max-w-[430px] min-h-screen bg-soft dark:bg-darkBg relative">

            {/* 🔥 Barre haute */}
            <TopNav />

            {/* Décalage contenu */}
            <div className="pt-20 pb-24">
              {children}
            </div>

            {/* 🔥 Barre basse */}
            <BottomNav />

          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
