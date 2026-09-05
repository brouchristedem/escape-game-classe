"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "./auth";
import { getQuizConfig } from "./data";

interface AdminModeContextValue {
  // Connecté ET organisateur du jeu actuellement affiché (déduit de l'URL,
  // ex. /g/{gameId}/...). Remplace l'ancien mot de passe partagé côté client
  // (Phase 2 du passage multi-tenant) : l'accès dépend maintenant d'un vrai
  // compte Firebase Auth et de la présence de son uid dans les organizers
  // du jeu concerné (vérifié aussi côté règles Firestore).
  isAdmin: boolean;
  editMode: boolean; // survol "mode édition" activé sur les pages du jeu
  setEditMode: (v: boolean) => void;
}

const AdminModeContext = createContext<AdminModeContextValue>({
  isAdmin: false,
  editMode: false,
  setEditMode: () => {},
});

export function useAdminMode() {
  return useContext(AdminModeContext);
}

// Extrait le gameId de l'URL courante si elle correspond à une page joueur
// d'un jeu (/g/{gameId}/...). Rend null pour toute autre page (accueil,
// espace organisateur /admin, etc.) : le mode édition inline n'a de sens
// que sur les pages joueur.
function gameIdDepuisChemin(pathname: string): string | null {
  const match = pathname.match(/^\/g\/([^/]+)/);
  return match ? match[1] : null;
}

function cleEditMode(gameId: string): string {
  return `admin_edit_mode_${gameId}`;
}

// Lecture synchrone (pas d'attente d'auth/Firestore) du mode édition
// persisté pour un jeu donné. Utilisée par les pages joueur pour décider,
// dès le tout premier rendu, si l'organisateur en train de parcourir le
// circuit doit être dispensé de revendiquer le rôle de chef d'équipe — un
// simple confort de navigation, pas une frontière de sécurité (celle-ci
// reste les règles Firestore, qui vérifient le vrai compte organisateur).
export function editModePersiste(gameId: string): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(cleEditMode(gameId)) === "1";
}

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, loading: authLoading } = useAuth();
  const gameId = gameIdDepuisChemin(pathname ?? "");

  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditModeState] = useState(false);

  useEffect(() => {
    setIsAdmin(false);
    setEditModeState(false);
    if (!gameId || !user || authLoading) return;
    let annule = false;
    getQuizConfig(gameId).then((config) => {
      if (annule) return;
      const estOrganisateur = (config.organizers ?? []).includes(user.uid);
      setIsAdmin(estOrganisateur);
      if (estOrganisateur) setEditModeState(editModePersiste(gameId));
    });
    return () => {
      annule = true;
    };
  }, [gameId, user, authLoading]);

  function setEditMode(v: boolean) {
    setEditModeState(v);
    if (gameId) sessionStorage.setItem(cleEditMode(gameId), v ? "1" : "0");
  }

  return (
    <AdminModeContext.Provider value={{ isAdmin, editMode: isAdmin && editMode, setEditMode }}>
      {children}
      {isAdmin && <AdminModeWidget editMode={editMode} setEditMode={setEditMode} />}
    </AdminModeContext.Provider>
  );
}

function AdminModeWidget({
  editMode,
  setEditMode,
}: {
  editMode: boolean;
  setEditMode: (v: boolean) => void;
}) {
  return (
    <div className="fixed bottom-4 right-4 z-50 print:hidden">
      <button
        onClick={() => setEditMode(!editMode)}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold shadow-lg transition ${
          editMode ? "bg-brand-blue text-white" : "bg-white text-brand-navy ring-1 ring-black/10"
        }`}
      >
        <span className={`h-2 w-2 rounded-full ${editMode ? "bg-white" : "bg-slate-300"}`} />
        {editMode ? "Mode édition activé" : "Activer le mode édition"}
      </button>
    </div>
  );
}
