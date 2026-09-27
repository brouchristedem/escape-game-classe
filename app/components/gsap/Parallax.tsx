"use client";

import { useRef, ReactNode } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "./gsapSetup";

interface ParallaxProps {
  children?: ReactNode;
  className?: string;
  /** Vitesse relative au scroll : négatif = plus lent que le scroll (effet de profondeur) */
  speed?: number;
}

/** Déplace son contenu verticalement en fonction du scroll, pour un effet de profondeur discret. */
export default function Parallax({ children, className, speed = -80 }: ParallaxProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!ref.current || prefersReducedMotion()) return;

      gsap.to(ref.current, {
        y: speed,
        ease: "none",
        scrollTrigger: {
          trigger: ref.current.parentElement ?? ref.current,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    },
    { scope: ref }
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
