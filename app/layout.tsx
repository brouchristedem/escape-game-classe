import type { Metadata } from "next";
import "./globals.css";
import { AdminModeProvider } from "@/lib/adminMode";

export const metadata: Metadata = {
  title: "Escape Game IUA Classe X",
  description: "Escape Game de la semaine d'intégration — IUA Classe X",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <AdminModeProvider>
          <div className="flex-1 flex flex-col">{children}</div>
          <footer className="py-4 text-center text-xs text-slate-400">
            Developer : Christ Edem BROU
          </footer>
        </AdminModeProvider>
      </body>
    </html>
  );
}
