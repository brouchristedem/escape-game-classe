"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

// Seul ce compte Google a le droit de se connecter via Google (Christ
// lui-même) : la connexion par e-mail/mot de passe reste le mécanisme
// normal pour les autres organisateurs, dont les comptes sont créés
// manuellement dans la Console Firebase.
const OWNER_EMAIL = "brouchristedem@gmail.com";

interface AuthContextValue {
  user: User | null;
  loading: boolean; // true tant qu'on ne sait pas encore si quelqu'un est connecté
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signInWithGoogle: () => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => ({ ok: false, error: "non initialisé" }),
  signUp: async () => ({ ok: false, error: "non initialisé" }),
  signInWithGoogle: async () => ({ ok: false, error: "non initialisé" }),
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

// Traduit les codes d'erreur Firebase Auth en messages compréhensibles pour
// un organisateur non technique.
function messageErreur(code: string): string {
  switch (code) {
    case "auth/invalid-email":
      return "Adresse e-mail invalide.";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "E-mail ou mot de passe incorrect.";
    case "auth/email-already-in-use":
      return "Un compte existe déjà avec cet e-mail.";
    case "auth/weak-password":
      return "Le mot de passe doit contenir au moins 6 caractères.";
    default:
      return "Une erreur est survenue. Réessayez.";
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      // Filet de sécurité : si une session Google pour un compte autre que
      // le propriétaire est restaurée (ex. onglet resté ouvert depuis avant
      // cette restriction), on la coupe plutôt que d'exposer l'espace
      // organisateur.
      const estGoogle = u?.providerData.some((p) => p.providerId === "google.com");
      if (u && estGoogle && u.email !== OWNER_EMAIL) {
        firebaseSignOut(auth);
        setUser(null);
        setLoading(false);
        return;
      }
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signIn(email: string, password: string) {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      return { ok: true };
    } catch (e) {
      const code = e instanceof Error && "code" in e ? String((e as { code: string }).code) : "";
      return { ok: false, error: messageErreur(code) };
    }
  }

  async function signUp(email: string, password: string) {
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      return { ok: true };
    } catch (e) {
      const code = e instanceof Error && "code" in e ? String((e as { code: string }).code) : "";
      return { ok: false, error: messageErreur(code) };
    }
  }

  async function signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, new GoogleAuthProvider());
      if (result.user.email !== OWNER_EMAIL) {
        // Un autre compte Google que celui du propriétaire s'est connecté :
        // on le déconnecte immédiatement. La vérification est aussi faite
        // niveau affichage (voir AuthProvider ci-dessous), mais la refaire
        // ici évite un flash de contenu autorisé avant la déconnexion.
        await firebaseSignOut(auth);
        return { ok: false, error: "Ce compte Google n'est pas autorisé à se connecter ici." };
      }
      return { ok: true };
    } catch (e) {
      const code = e instanceof Error && "code" in e ? String((e as { code: string }).code) : "";
      if (code === "auth/popup-closed-by-user") return { ok: false, error: "" };
      return { ok: false, error: messageErreur(code) };
    }
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
