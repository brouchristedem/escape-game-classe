"use client";

import { useRef, ElementType } from "react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText, prefersReducedMotion } from "./gsapSetup";

interface SplitRevealProps {
  text: string;
  as?: ElementType;
  className?: string;
  /** "chars" pour lettre par lettre, "words" pour mot par mot */
  type?: "chars" | "words";
  delay?: number;
}

/**
 * Révèle un titre lettre par lettre (ou mot par mot) au moment où il entre
 * dans l'écran au scroll. Prévu pour des titres courts (hero, en-têtes de
 * section) — évite de l'utiliser sur de longs paragraphes.
 */
export default function SplitReveal({
  text,
  as: Tag = "h2",
  className,
  type = "chars",
  delay = 0,
}: SplitRevealProps) {
  const ref = useRef<HTMLHeadingElement>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      if (prefersReducedMotion()) {
        gsap.set(ref.current, { opacity: 1 });
        return;
      }

      const split = SplitText.create(ref.current, {
        type,
        mask: type, // masque le débordement pendant l'animation (effet "rideau")
      });
      const targets = type === "chars" ? split.chars : split.words;

      gsap.fromTo(
        targets,
        { opacity: 0, yPercent: 100 },
        {
          opacity: 1,
          yPercent: 0,
          duration: 0.7,
          delay,
          ease: "back.out(1.7)",
          stagger: type === "chars" ? 0.025 : 0.06,
          scrollTrigger: {
            trigger: ref.current,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        }
      );

      return () => split.revert();
    },
    { scope: ref, dependencies: [text, type] }
  );

  const Component = Tag as ElementType;
  return (
    <Component ref={ref} className={className}>
      {text}
    </Component>
  );
}
