import type { Metadata, Viewport } from "next";
import { Alegreya_Sans, Cinzel, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { AdminModeProvider } from "@/lib/adminMode";
import { AuthProvider } from "@/lib/auth";
import Lanterne from "@/app/components/Lanterne";

// Polices de l'identité "Grimoire" : Cinzel (titres gravés), Alegreya Sans
// (texte courant, chaleureux et lisible), IBM Plex Mono (chrono, codes).
const cinzel = Cinzel({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-cinzel", display: "swap" });
const alegreya = Alegreya_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-alegreya", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-plexmono", display: "swap" });

export const metadata: Metadata = {
  title: "Escape Game",
  description: "Plateforme d'escape game personnalisable",
};

export const viewport: Viewport = {
  themeColor: "#e9dfc4",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${cinzel.variable} ${alegreya.variable} ${plexMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <Lanterne />
          <AdminModeProvider>
            <div className="flex-1 flex flex-col">{children}</div>
          </AdminModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
