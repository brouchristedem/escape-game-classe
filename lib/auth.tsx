"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  User,
} from "firebase/auth";
import { auth } from "./firebase";

interface AuthContextValue {
  user: User | null;
  loading: boolean; // true tant qu'on ne sait pas encore si quelqu'un est connecté
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => ({ ok: false, error: "non initialisé" }),
  signUp: async () => ({ ok: false, error: "non initialisé" }),
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

  async function signOut() {
    await firebaseSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
