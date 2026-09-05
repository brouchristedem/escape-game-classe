"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// La racine du site n'est plus liée à un jeu unique (voir passage
// multi-tenant) : chaque jeu a son propre lien public /g/{gameId}. La racine
// redirige donc vers l'espace organisateur, qui liste tous les jeux.
export default function Root() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/admin");
  }, [router]);
  return null;
}
