import type { Metadata, Viewport } from "next";
import { Cinzel, IBM_Plex_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AdminModeProvider } from "@/lib/adminMode";
import { AuthProvider } from "@/lib/auth";
import Lanterne from "@/app/components/Lanterne";

// Polices de l'identité "Le Gardien" : Cinzel (titres gravés), Alegreya Sans
// (texte courant, auto-hébergé pour garantir les chiffres alignés), IBM Plex Mono (chrono, codes).
const cinzel = Cinzel({ subsets: ["latin"], weight: ["600", "700", "800"], variable: "--font-cinzel", display: "swap" });
const alegreya = localFont({
  src: [
    { path: "./fonts/AlegreyaSans-400.woff2", weight: "400", style: "normal" },
    { path: "./fonts/AlegreyaSans-500.woff2", weight: "500", style: "normal" },
    { path: "./fonts/AlegreyaSans-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-alegreya",
  display: "swap",
});
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-plexmono", display: "swap" });

export const metadata: Metadata = {
  title: "Escape Game",
  description: "Plateforme d'escape game personnalisable",
};

export const viewport: Viewport = {
  themeColor: "#cdd5e2",
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
