import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeFirestore, getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const appExistaitDeja = getApps().length > 0;
export const app = appExistaitDeja ? getApp() : initializeApp(firebaseConfig);
// ignoreUndefinedProperties : sans ça, setDoc()/tx.set() lèvent une erreur
// dès qu'un champ vaut `undefined` (ex. LiveState.propositions, absent pour
// les énigmes de type "réponse libre"). Cette erreur était catchée en
// silence dans publierLiveState, donc le document liveState n'était jamais
// écrit avec phase="playing" quand la première énigme d'une salle était en
// mode libre — d'où "le chef n'a pas commencé" affiché sur /suivre alors
// qu'il avait bien commencé.
export const db = appExistaitDeja
  ? getFirestore(app)
  : initializeFirestore(app, { ignoreUndefinedProperties: true });

// Authentification organisateur (Phase 2 du passage multi-tenant) : chaque
// organisateur a un vrai compte Firebase Auth (email/mot de passe), au lieu
// du mot de passe unique partagé côté client de la Phase 1.
export const auth = getAuth(app);
