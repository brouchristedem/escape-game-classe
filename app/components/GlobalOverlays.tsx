"use client";

import { useEffect, useRef, useState } from "react";
import { BroadcastMessage, TempsGeneral, TempsGeneralAjustement } from "@/lib/types";

// Affiche, en haut de l'écran de jeu :
// - le chrono général (commun à toutes les équipes), avec une notification
//   discrète quand l'organisateur ajoute/retranche du temps en direct ;
// - le message ponctuel diffusé par l'organisateur, pendant sa durée, sans
//   jamais bloquer le reste de l'écran (le jeu continue normalement en
//   dessous).
export default function GlobalOverlays({
  tempsGeneral,
  tempsGeneralAjustement,
  broadcast,
}: {
  tempsGeneral: TempsGeneral;
  tempsGeneralAjustement: TempsGeneralAjustement | null;
  broadcast: BroadcastMessage | null;
}) {
  const [secondesRestantes, setSecondesRestantes] = useState<number | null>(null);
  const [notif, setNotif] = useState<string | null>(null);
  const [broadcastVisible, setBroadcastVisible] = useState(false);
  const dernierAjustementVu = useRef<number | null>(null);
  const dernierBroadcastVu = useRef<string | null>(null);

  // Décompte local du chrono général, resynchronisé à chaque changement de
  // finTimestamp (ex. ajustement par l'organisateur).
  useEffect(() => {
    if (!tempsGeneral.finTimestamp) {
      setSecondesRestantes(null);
      return;
    }
    const fin = tempsGeneral.finTimestamp;
    const tick = () => setSecondesRestantes(Math.max(0, Math.round((fin - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [tempsGeneral.finTimestamp]);

  // Notification "+10 min ajoutées" quand l'organisateur ajuste le chrono.
  useEffect(() => {
    if (!tempsGeneralAjustement) return;
    if (dernierAjustementVu.current === tempsGeneralAjustement.at) return;
    dernierAjustementVu.current = tempsGeneralAjustement.at;
    const minutes = Math.round(Math.abs(tempsGeneralAjustement.deltaSecondes) / 60);
    const unite = minutes > 0 ? `${minutes} min` : `${Math.abs(tempsGeneralAjustement.deltaSecondes)} s`;
    setNotif(tempsGeneralAjustement.deltaSecondes >= 0 ? `+${unite} ajoutées au chrono` : `-${unite} retranchées au chrono`);
    const id = setTimeout(() => setNotif(null), 5000);
    return () => clearTimeout(id);
  }, [tempsGeneralAjustement]);

  // Message ponctuel : visible pendant sa durée, à partir du moment où il a
  // été envoyé (fonctionne même si la page vient d'être ouverte après
  // l'envoi, tant que la durée n'est pas écoulée).
  useEffect(() => {
    if (!broadcast) return;
    if (dernierBroadcastVu.current === broadcast.id) return;
    dernierBroadcastVu.current = broadcast.id;
    const finAffichage = broadcast.envoyeAt + broadcast.dureeSecondes * 1000;
    const restant = finAffichage - Date.now();
    if (restant <= 0) return;
    setBroadcastVisible(true);
    const id = setTimeout(() => setBroadcastVisible(false), restant);
    return () => clearTimeout(id);
  }, [broadcast]);

  const rienAAfficher = secondesRestantes === null && !notif && !(broadcast && broadcastVisible);
  if (rienAAfficher) return null;

  return (
    <div className="fixed top-0 inset-x-0 z-40 flex flex-col items-center gap-2 px-4 pt-3 pointer-events-none">
      {secondesRestantes !== null && (
        <span
          className={`pointer-events-auto font-semibold rounded-full px-4 py-1.5 shadow-md text-sm ${
            secondesRestantes <= 60 ? "bg-red-500 text-white" : "bg-white/95 text-brand-navy ring-1 ring-black/10"
          }`}
        >
          ⏱️ {formatDuree(secondesRestantes)}
        </span>
      )}
      {notif && (
        <span className="pointer-events-auto bg-brand-blue text-white text-xs font-medium rounded-full px-4 py-1.5 shadow-md animate-pulse">
          {notif}
        </span>
      )}
      {broadcast && broadcastVisible && (
        <div className="pointer-events-auto max-w-md w-full rounded-2xl bg-violet-600 text-white px-5 py-3 shadow-lg text-center text-sm font-medium">
          📢 {broadcast.texte}
        </div>
      )}
    </div>
  );
}

function formatDuree(secondes: number): string {
  const m = Math.floor(secondes / 60);
  const s = secondes % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
