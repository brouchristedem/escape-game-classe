import type { Metadata } from "next";
import "./globals.css";
import { AdminModeProvider } from "@/lib/adminMode";
import { AuthProvider } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Escape Game",
  description: "Plateforme d'escape game personnalisable",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
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
