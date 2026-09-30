import Image from "next/image";
import type { ReactNode } from "react";

// Le Gardien des Mystères : le personnage du site, dans un cadre de cachot
// (voir .cadre dans globals.css). Le médaillon (logo) chevauche le bas du
// portrait ; passe-le en enfant.
export default function PortraitGardien({
  children,
  compact = false,
  className = "",
}: {
  children?: ReactNode;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${compact ? "w-[min(17rem,78vw)]" : "w-[min(20rem,82vw)]"} ${children ? "mb-14" : ""} ${className}`}>
      <div className="cadre rounded-2xl bg-dalle p-2 shadow-[0_0_54px_-6px_rgba(77,179,255,0.6)]">
        <div className={`relative overflow-hidden rounded-xl bg-nuit ${compact ? "aspect-[4/3]" : "aspect-[4/5]"}`}>
          <Image
            src="/gardien.jpg"
            alt="Le Gardien des Mystères, silhouette à capuche assise devant ses écrans"
            fill
            priority
            sizes="(max-width: 640px) 80vw, 320px"
            className={`object-cover ${compact ? "object-[50%_22%]" : "object-[50%_30%]"}`}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-nuit via-nuit/60 to-transparent" />
        </div>
      </div>
      {children && <div className="absolute left-1/2 -bottom-11 -translate-x-1/2">{children}</div>}
    </div>
  );
}
