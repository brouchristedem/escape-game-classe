"use client";

// Le "mode édition" (modifier les textes/énigmes directement depuis les
// pages joueur /g/...) a été retiré : toutes les modifications se font
// désormais exclusivement depuis l'espace organisateur (/admin/{gameId}).
// Ce fichier ne reste que comme point d'import stable pour les composants
// existants (EditableText, pages /g/...) : isAdmin/editMode sont toujours
// false, aucun bouton flottant ne s'affiche, aucune donnée n'est modifiable
// en dehors de l'admin.

interface AdminModeContextValue {
  isAdmin: boolean;
  editMode: boolean;
  setEditMode: (v: boolean) => void;
}

const NOOP: AdminModeContextValue = {
  isAdmin: false,
  editMode: false,
  setEditMode: () => {},
};

export function useAdminMode(): AdminModeContextValue {
  return NOOP;
}

// Conservé pour compatibilité d'import ; toujours false désormais (plus de
// mode édition sur les pages joueur).
export function editModePersiste(_gameId?: string): boolean {
  return false;
}

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
