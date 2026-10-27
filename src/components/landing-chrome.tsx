'use client';

import type { ReactNode } from "react";
import type { MouseEventHandler } from "react";
import { cn } from "@/lib/utils/cn";

/* ═══════════════════════════════════════════════════════════════
   PairCode landing chrome — shared brand marks, corner brackets,
   hero decor and the signature swipe-fill button, ported from the
   landing page so the editor speaks the same visual language.
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

/** Isometric grid + hatch backdrop with top fade (landing hero). */
export function IsoGrid() {
  return (
    <div
      className="absolute top-0 inset-x-0 w-full h-[700px] pointer-events-none select-none overflow-hidden"
      style={{
        maskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 120px, rgba(0,0,0,0.2) 260px, rgba(0,0,0,0.06) 440px, transparent 640px)",
        WebkitMaskImage: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.45) 120px, rgba(0,0,0,0.2) 260px, rgba(0,0,0,0.06) 440px, transparent 640px)",
      }}
    >
      <svg className="w-full h-full dark:opacity-30 opacity-[0.12]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="pc-iso" width="120" height="69.282" patternUnits="userSpaceOnUse">
            <g transform="translate(30, 17.32)">
              <polygon points="0,-17.32 30,0 0,17.32 -30,0" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
              <polygon points="-30,0 0,17.32 0,51.96 -30,34.64" fill="rgba(255,255,255,0.008)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
              <polygon points="0,17.32 30,0 30,34.64 0,51.96" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
            </g>
            <g transform="translate(90, 51.96)">
              <polygon points="0,-17.32 30,0 0,17.32 -30,0" fill="rgba(255,255,255,0.02)" stroke="rgba(255,255,255,0.07)" strokeWidth="0.8" />
              <polygon points="-30,0 0,17.32 0,51.96 -30,34.64" fill="rgba(255,255,255,0.008)" stroke="rgba(255,255,255,0.05)" strokeWidth="0.8" />
              <polygon points="0,17.32 30,0 30,34.64 0,51.96" fill="rgba(255,255,255,0.015)" stroke="rgba(255,255,255,0.06)" strokeWidth="0.8" />
            </g>
          </pattern>
          <pattern id="pc-hatch" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M-1,5 L5,-1 M-1,19 L19,-1 M-1,33 L33,-1 M9,33 L33,9 M23,33 L33,23" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#pc-iso)" />
        <rect width="100%" height="100%" fill="url(#pc-hatch)" opacity="0.3" />
      </svg>
    </div>
  );
}

/** Twin S-curves with a flowing dash of light (landing hero rails). */
export function FlowLines() {
  const d = "M 138.5 0 L 138.5 373.523 C 138.5 422.622 112.031 467.907 69.25 492 L 69.25 492 C 26.469 516.093 0 561.378 0 610.477 L 0 985.5";
  const rail = (mirror: boolean, offsets: number[]) => (
    <>
      {offsets.map((top) => (
        <div key={top} className="absolute w-[151px] h-[986px] pointer-events-none select-none overflow-visible" style={{ top }}>
          <svg className="w-full h-full overflow-visible" viewBox="0 0 151 986" fill="none" role="presentation">
            <g transform={mirror ? "translate(151, 0) scale(-1, 1)" : undefined}>
              <path d={d} fill="none" stroke="rgba(34,197,94,0.07)" strokeWidth="0.8" strokeLinecap="butt" />
              <path
                d={d}
                fill="none"
                stroke="rgba(34,197,94,0.55)"
                strokeWidth="1"
                strokeLinecap="round"
                strokeDasharray="1036.24 1036.24"
                className="animate-paircode-flow"
                style={{ filter: "drop-shadow(0 0 1.5px rgba(34,197,94,0.45))" }}
              />
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

/* ── Signature landing button: chip that fills from the left icon
   plate to full width on hover, label flipping to the fill's contrast
   tone. Tones are tokenized so BOTH light and dark modes stay legible:
   - accent fill stays green in both modes → black icon/label flip.
   - foreground fill is near-white in dark / near-black in light →
     the icon always reads `text-background` (black-on-white / white-on-zinc).
   ── */

type FillVariant = "accent" | "white";

interface FillBaseProps {
  label: string;
  /** The icon drawn on the leading 36px plate (black-on-fill). */
  icon: ReactNode;
  /** Trailing arrow (from the landing hero CTAs). */
  arrow?: boolean;
  variant?: FillVariant;
  /** sm = dashboard-card / modal scale, md = hero scale. */
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
}

/** Chip shell — shared by hero CTAs and the dashboard card CTAs. */
export function chipClasses(variant: FillVariant) {
  // Surface/border tone matches the landing (`bg-[#0c0c10]`, `border-white/20
  // hover:border-white`) in dark and translates to zinc tokens in light mode.
  return cn(
    "group relative inline-flex items-center justify-between p-1",
    "bg-foreground/[0.035] border border-foreground/20 hover:border-foreground/70",
    "transition-all duration-300 active:scale-[0.98] cursor-pointer",
    variant === "accent" ? "shadow-lg" : "shadow-sm"
  );
}

/** The swipe sweep. Explicit width transition + will-change = buttery tween. */
export function sweepClasses(variant: FillVariant, size: "sm" | "md") {
  return cn(
    "absolute inset-y-1 left-1 pointer-events-none will-change-[width]",
    size === "sm" ? "w-8" : "w-9",
    "transition-[width] duration-[450ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
    "group-hover:w-[calc(100%-8px)]",
    variant === "accent" ? "bg-accent" : "bg-foreground"
  );
}

/** Icon plate tone — must always contrast the resting fill beneath it. */
export function iconClasses(variant: FillVariant, size: "sm" | "md") {
  return cn(
    size === "sm" ? "w-8 h-8" : "w-9 h-9",
    "flex items-center justify-center shrink-0 transition-colors duration-300",
    variant === "accent" ? "text-black" : "text-background"
  );
}

/** Label tone — tokenized so day mode doesn't render white-on-white. */
export function labelClasses(variant: FillVariant, size: "sm" | "md") {
  return cn(
    "transition-colors duration-300",
    size === "sm" ? "text-sm font-semibold tracking-wide" : "text-[15px] font-semibold",
    variant === "accent"
      ? "text-foreground group-hover:text-black"
      : "text-foreground group-hover:text-background"
  );
}

/** Trailing arrow tone. */
export function arrowClasses(variant: FillVariant) {
  return cn(
    "pl-3",
    variant === "accent"
      ? "text-foreground/50 group-hover:text-black"
      : "text-foreground/40 group-hover:text-background",
    "group-hover:translate-x-1 transition-all duration-300"
  );
}

export function FillButton({ label, icon, arrow = true, variant = "accent", size = "md", className, disabled, onClick, type }: FillBaseProps & { onClick?: MouseEventHandler<HTMLButtonElement>; type?: "button" | "submit" }) {
  return (
    <button
      type={type ?? "button"}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        chipClasses(variant),
        disabled && "opacity-50 pointer-events-none cursor-not-allowed",
        arrow ? "pr-4" : "pr-3",
        size === "sm" ? "w-full" : "w-full sm:w-auto",
        className
      )}
    >
      <Corners />
      <span className={sweepClasses(variant, size)} />
      <span className="relative z-10 flex items-center gap-3">
        <span className={iconClasses(variant, size)}>
          {icon}
        </span>
        <span className={labelClasses(variant, size)}>
          {label}
        </span>
      </span>
      {arrow && (
        <span className={cn("relative z-10", arrowClasses(variant))}>
          →
        </span>
      )}
    </button>
  );
}

/** Anchor twin of FillButton (landing hero CTAs semantics). */
export function FillLink({ label, icon, arrow = true, variant = "accent", size = "md", className, href, target, rel, onClick }: FillBaseProps & { href: string; target?: string; rel?: string; onClick?: MouseEventHandler<HTMLAnchorElement> }) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      onClick={onClick}
      className={cn(
        chipClasses(variant),
        arrow ? "pr-4" : "pr-3",
        size === "sm" ? "w-full" : "w-full sm:w-auto",
        className
      )}
    >
      <Corners />
      <span className={sweepClasses(variant, size)} />
      <span className="relative z-10 flex items-center gap-3">
        <span className={iconClasses(variant, size)}>
          {icon}
        </span>
        <span className={labelClasses(variant, size)}>
          {label}
        </span>
      </span>
      {arrow && (
        <span className={cn("relative z-10", arrowClasses(variant))}>
          →
        </span>
      )}
    </a>
  );
}
