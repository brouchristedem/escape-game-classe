"use client";

import { useEffect } from "react";

// La "lanterne" : une lueur chaude qui suit le doigt ou la souris sur le
// parchemin (voir .bg-brume dans globals.css). Sans mouvement, la lueur
// reste en haut de page. Ne fait rien si l'utilisateur réduit les animations.
export default function Lanterne() {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const racine = document.documentElement;
    let raf = 0;
    let x = 0;
    let y = 0;
    const appliquer = () => {
      raf = 0;
      racine.style.setProperty("--mx", `${x}px`);
      racine.style.setProperty("--my", `${y}px`);
    };
    const bouger = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf) raf = requestAnimationFrame(appliquer);
    };
    window.addEventListener("pointermove", bouger, { passive: true });
    return () => {
      window.removeEventListener("pointermove", bouger);
      if (raf) cancelAnimationFrame(raf);
      racine.style.removeProperty("--mx");
      racine.style.removeProperty("--my");
    };
  }, []);
  return null;
}
