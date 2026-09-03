"use client";

import { createContext, useContext, useEffect, useState } from "react";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "integration2026";
const STORAGE_KEY = "admin_ok";

interface AdminModeContextValue {
  isAdmin: boolean; // mot de passe organisateur déjà saisi dans cet onglet
  editMode: boolean; // survol "mode édition" activé sur les pages du jeu
  unlock: (password: string) => boolean;
  setEditMode: (v: boolean) => void;
}

const AdminModeContext = createContext<AdminModeContextValue>({
  isAdmin: false,
  editMode: false,
  unlock: () => false,
  setEditMode: () => {},
});

export function useAdminMode() {
  return useContext(AdminModeContext);
}

export function AdminModeProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false);
  const [editMode, setEditModeState] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem(STORAGE_KEY) === "1") setIsAdmin(true);
    if (sessionStorage.getItem("admin_edit_mode") === "1") setEditModeState(true);
  }, []);

  function unlock(password: string) {
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(STORAGE_KEY, "1");
      setIsAdmin(true);
      return true;
    }
    return false;
  }

  function setEditMode(v: boolean) {
    setEditModeState(v);
    sessionStorage.setItem("admin_edit_mode", v ? "1" : "0");
  }

  return (
    <AdminModeContext.Provider value={{ isAdmin, editMode: isAdmin && editMode, unlock, setEditMode }}>
      {children}
      <AdminModeWidget isAdmin={isAdmin} editMode={editMode} unlock={unlock} setEditMode={setEditMode} />
    </AdminModeContext.Provider>
  );
}

function AdminModeWidget({
  isAdmin,
  editMode,
  unlock,
  setEditMode,
}: {
  isAdmin: boolean;
  editMode: boolean;
  unlock: (p: string) => boolean;
  setEditMode: (v: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  function trySubmit() {
    if (unlock(pwd)) {
      setError("");
      setPwd("");
      setOpen(false);
      setEditMode(true);
    } else {
      setError("Mot de passe incorrect.");
    }
  }

  if (!isAdmin) {
    return (
      <div className="fixed bottom-4 right-4 z-50 print:hidden">
        {open ? (
          <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black/10 p-3 flex flex-col gap-2 w-56">
            <p className="text-xs text-slate-500">Accès organisateur</p>
            <input
              type="password"
              value={pwd}
              onChange={(e) => setPwd(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && trySubmit()}
              placeholder="Mot de passe"
              autoFocus
              className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-blue"
            />
            {error && <p className="text-red-500 text-xs">{error}</p>}
            <div className="flex gap-2">
              <button onClick={trySubmit} className="bg-brand-blue text-white text-xs font-semibold rounded-full px-3 py-1.5">
                Entrer
              </button>
              <button onClick={() => setOpen(false)} className="text-slate-400 text-xs">
                Annuler
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            title="Accès organisateur"
            className="h-9 w-9 rounded-full bg-white/70 backdrop-blur ring-1 ring-black/10 text-slate-400 hover:text-brand-blue hover:ring-brand-blue/40 transition flex items-center justify-center text-sm"
          >
            ⚙
          </button>
        )}
      </div>
    );
  }

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
