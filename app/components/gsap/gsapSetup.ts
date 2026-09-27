"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Enregistrement unique des plugins (SplitText et ScrollTrigger sont 100% gratuits
// depuis GSAP 3.13, inclus directement dans le package "gsap").
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

/** Respecte le réglage d'accessibilité du système : pas d'animation si demandé. */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export { gsap, ScrollTrigger, SplitText };
