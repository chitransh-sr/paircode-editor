'use client';

/* ═══════════════════════════════════════════════════════════════
   PairCode landing chrome — shared brand marks, corner brackets
   and hero decor, ported from the landing page so the editor
   speaks the same visual language.
   CTA chrome lives in components/specular-button: <SpecularCta/>
   themes the React Bits <SpecularButton/> per theme/variant and is
   the single button system for every call-to-action.
   ═══════════════════════════════════════════════════════════════ */

export const ACCENT = "#22C55E";

/** GitHub octocat mark (landing header/footer). */
export function GithubMark({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/** PairCode wordmark: mirrored < > chevrons in the accent green. */
export function PairMark({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" className={className} aria-hidden="true">
      <path d="M24 19 L12 32 L24 45" stroke={ACCENT} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M40 19 L52 32 L40 45" stroke={ACCENT} strokeWidth="7" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Hiveory-style L-shaped corner brackets (landing cards/buttons). */
export function Corners({ className = "" }: { className?: string }) {
  const c = "absolute w-2 h-2 border-muted-foreground/60 group-hover:border-foreground transition-colors duration-300 pointer-events-none";
  void className;
  return (
    <>
      <span className={`${c} -top-[1px] -left-[1px] border-t-2 border-l-2`} />
      <span className={`${c} -top-[1px] -right-[1px] border-t-2 border-r-2`} />
      <span className={`${c} -bottom-[1px] -left-[1px] border-b-2 border-l-2`} />
      <span className={`${c} -bottom-[1px] -right-[1px] border-b-2 border-r-2`} />
    </>
  );
}

/** Isometric grid + hatch backdrop with top fade (landing hero).
    Theme-aware: the white-alpha set reads on the dark canvas, and a
    carbon/zinc-alpha twin covers the light canvas — same geometry. */
export function IsoGrid() {
  const mask = "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 120px, rgba(0,0,0,0.2) 260px, rgba(0,0,0,0.06) 440px, transparent 640px)";
  const iso = (variant: "dark" | "light") => {
    const s = variant === "dark"
      ? { f1: "rgba(255,255,255,0.02)", f2: "rgba(255,255,255,0.008)", f3: "rgba(255,255,255,0.015)", k1: "rgba(255,255,255,0.07)", k2: "rgba(255,255,255,0.05)", k3: "rgba(255,255,255,0.06)", hatch: "rgba(255,255,255,0.04)", svg: "w-full h-full opacity-30" }
      : { f1: "rgba(9,9,11,0.016)", f2: "rgba(9,9,11,0.006)", f3: "rgba(9,9,11,0.012)", k1: "rgba(9,9,11,0.085)", k2: "rgba(9,9,11,0.05)", k3: "rgba(9,9,11,0.07)", hatch: "rgba(9,9,11,0.045)", svg: "w-full h-full opacity-40" };
    const id = `pc-iso-${variant}`;
    return (
      <svg
        className={`${s.svg} ${variant === "dark" ? "dark:block hidden" : "block dark:hidden"}`}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <pattern id={id} width="120" height="69.282" patternUnits="userSpaceOnUse">
            <g transform="translate(30, 17.32)">
              <polygon points="0,-17.32 30,0 0,17.32 -30,0" fill={s.f1} stroke={s.k1} strokeWidth="0.8" />
              <polygon points="-30,0 0,17.32 0,51.96 -30,34.64" fill={s.f2} stroke={s.k2} strokeWidth="0.8" />
              <polygon points="0,17.32 30,0 30,34.64 0,51.96" fill={s.f3} stroke={s.k3} strokeWidth="0.8" />
            </g>
            <g transform="translate(90, 51.96)">
              <polygon points="0,-17.32 30,0 0,17.32 -30,0" fill={s.f1} stroke={s.k1} strokeWidth="0.8" />
              <polygon points="-30,0 0,17.32 0,51.96 -30,34.64" fill={s.f2} stroke={s.k2} strokeWidth="0.8" />
              <polygon points="0,17.32 30,0 30,34.64 0,51.96" fill={s.f3} stroke={s.k3} strokeWidth="0.8" />
            </g>
          </pattern>
          <pattern id={`pc-hatch-${variant}`} width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M-1,5 L5,-1 M-1,19 L19,-1 M-1,33 L33,-1 M9,33 L33,9 M23,33 L33,23" fill="none" stroke={s.hatch} strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
        <rect width="100%" height="100%" fill={`url(#pc-hatch-${variant})`} opacity="0.3" />
      </svg>
    );
  };
  return (
    <div
      className="absolute top-0 inset-x-0 w-full h-[700px] pointer-events-none select-none overflow-hidden"
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    >
      {iso("dark")}
      {iso("light")}
    </div>
  );
}

/** Twin S-curves with a flowing dash of light (landing hero rails).
    Dark rails use the landing white-green alpha set; light mode gets a
    slightly deeper green so the rails don't wash out on the zinc-50
    canvas — same geometry drawn twice, toggled by the `.dark` class. */
export function FlowLines() {
  const d = "M 138.5 0 L 138.5 373.523 C 138.5 422.622 112.031 467.907 69.25 492 L 69.25 492 C 26.469 516.093 0 561.378 0 610.477 L 0 985.5";
  const strokeSet = (variant: "dark" | "light") => {
    const [rail, dash, shadow] = variant === "dark"
      ? ["rgba(34,197,94,0.07)", "rgba(34,197,94,0.55)", "drop-shadow(0 0 1.5px rgba(34,197,94,0.45))"]
      : ["rgba(34,197,94,0.12)", "rgba(34,197,94,0.65)", "drop-shadow(0 0 1.5px rgba(34,197,94,0.5))"];
    return (
      <g className={variant === "dark" ? "dark:block hidden" : "block dark:hidden"}>
        <path d={d} fill="none" stroke={rail} strokeWidth="0.8" strokeLinecap="butt" />
        <path
          d={d}
          fill="none"
          stroke={dash}
          strokeWidth="1"
          strokeLinecap="round"
          strokeDasharray="1036.24 1036.24"
          className="animate-paircode-flow"
          style={{ filter: shadow }}
        />
      </g>
    );
  };
  const rail = (mirror: boolean, offsets: number[]) => (
    <>
      {offsets.map((top) => (
        <div key={top} className="absolute w-[151px] h-[986px] pointer-events-none select-none overflow-visible" style={{ top }}>
          <svg className="w-full h-full overflow-visible" viewBox="0 0 151 986" fill="none" role="presentation">
            <g transform={mirror ? "translate(151, 0) scale(-1, 1)" : undefined}>
              {strokeSet("dark")}
              {strokeSet("light")}
            </g>
          </svg>
        </div>
      ))}
    </>
  );
  return (
    <div
      className="absolute top-0 bottom-[-300px] left-1/2 -translate-x-1/2 w-[1014px] pointer-events-none overflow-visible hidden md:block"
      style={{
        maskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 4%, black 10%, black 84%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.7) 4%, black 10%, black 84%, transparent 100%)",
      }}
    >
      <div className="absolute top-0 bottom-0 left-[4px] w-[151px]">{rail(true, [0, 56, 112])}</div>
      <div className="absolute top-0 bottom-0 left-[859px] w-[151px]">{rail(false, [0, 56, 112])}</div>
    </div>
  );
}
