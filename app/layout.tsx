import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Escape Game IUA X Classe",
  description: "Escape Game de la semaine d'intégration — IUA X Classe",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="fr" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
