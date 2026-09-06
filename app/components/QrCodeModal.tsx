"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

// Génère le QR code entièrement dans le navigateur (aucun service externe,
// aucune donnée envoyée nulle part) à partir du lien fourni, et propose de
// le télécharger en PNG pour l'imprimer ou l'afficher en salle.
export default function QrCodeModal({ lien, nom, onClose }: { lien: string; nom: string; onClose: () => void }) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let annule = false;
    QRCode.toDataURL(lien, { width: 480, margin: 2, color: { dark: "#0d1526", light: "#ffffff" } })
      .then((url) => {
        if (!annule) setDataUrl(url);
      })
      .catch(() => {});
    return () => {
      annule = true;
    };
  }, [lien]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl p-6 max-w-xs w-full flex flex-col items-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="font-semibold text-brand-navy mb-1 text-center">{nom}</p>
        <p className="text-xs text-slate-400 mb-4 text-center break-all">{lien}</p>

        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dataUrl} alt={`QR code du jeu ${nom}`} className="w-56 h-56 rounded-lg ring-1 ring-black/5" />
        ) : (
          <div className="w-56 h-56 rounded-lg bg-slate-100 animate-pulse" />
        )}

        <div className="flex gap-2 mt-5 w-full">
          {dataUrl && (
            <a
              href={dataUrl}
              download={`qrcode-${nom.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.png`}
              className="flex-1 text-center bg-brand-blue hover:bg-brand-navy text-white font-semibold text-sm px-4 py-2.5 rounded-lg transition"
            >
              Télécharger
            </a>
          )}
          <button
            onClick={onClose}
            className="flex-1 text-center bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold text-sm px-4 py-2.5 rounded-lg transition"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
