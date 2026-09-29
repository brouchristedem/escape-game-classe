import type { Metadata, Viewport } from "next";
import { Manrope, Syne, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AdminModeProvider } from "@/lib/adminMode";
import { AuthProvider } from "@/lib/auth";

// Polices de l'identité "Brume & Signal" : Syne (titres, large et atypique),
// Manrope (texte courant), JetBrains Mono (chrono, codes, données).
const syne = Syne({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-syne", display: "swap" });
const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const jbMono = JetBrains_Mono({ subsets: ["latin"], weight: ["500", "700"], variable: "--font-jbmono", display: "swap" });

export const metadata: Metadata = {
  title: "Escape Game",
  description: "Plateforme d'escape game personnalisable",
};

export const viewport: Viewport = {
  themeColor: "#d5d1f1",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className={`${syne.variable} ${manrope.variable} ${jbMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AdminModeProvider>
            <div className="flex-1 flex flex-col">{children}</div>
          </AdminModeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
