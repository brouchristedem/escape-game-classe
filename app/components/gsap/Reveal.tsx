"use client";

import { useRef, ReactNode, ElementType } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, prefersReducedMotion } from "./gsapSetup";

interface RevealProps {
  children: ReactNode;
  /** Élément HTML à rendre (div par défaut, "section" pour un bloc sémantique, etc.) */
  as?: ElementType;
  className?: string;
  /** Anime chaque enfant direct en cascade au lieu du bloc entier d'un coup */
  stagger?: boolean;
  /** Décalage en secondes entre chaque enfant si stagger est actif */
  staggerAmount?: number;
  /** Distance de translation verticale de départ (px) */
  y?: number;
  /** Délai avant le déclenchement (s) */
  delay?: number;
}

/**
 * Fait apparaître son contenu (fondu + translation) quand il entre dans la
 * zone visible au scroll. Utiliser `stagger` pour animer une liste de cartes
 * ou de blocs les uns après les autres plutôt qu'en un seul mouvement.
 */
export default function Reveal({
  children,
  as: Tag = "div",
  className,
  stagger = false,
  staggerAmount = 0.12,
  y = 40,
  delay = 0,
}: RevealProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!containerRef.current || prefersReducedMotion()) return;

      const targets = stagger
        ? gsap.utils.toArray<HTMLElement>(containerRef.current.children)
        : containerRef.current;

      gsap.fromTo(
        targets,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          delay,
          ease: "power3.out",
          stagger: stagger ? staggerAmount : 0,
          scrollTrigger: {
            trigger: containerRef.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );
      // Pas de nettoyage manuel : useGSAP() (via gsap.context) annule
      // automatiquement les tweens et ScrollTriggers de ce composant au démontage.
    },
    { scope: containerRef }
  );

  const Component = Tag as ElementType;
  return (
    <Component ref={containerRef} className={className}>
      {children}
    </Component>
  );
}
