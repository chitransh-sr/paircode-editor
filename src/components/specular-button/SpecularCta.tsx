'use client';

import type { CSSProperties, MouseEventHandler, ReactNode } from "react";
import SpecularButton from "./SpecularButton";
import { useTheme } from "@/hooks/use-theme";
import { ACCENT } from "@/components/landing-chrome";

/**
 * SpecularCta — single source of truth for every primary/secondary CTA.
 * Thin theme adapter over the React Bits <SpecularButton/> (pure React +
 * WebGL2, no dependencies): it keeps the original glass button 1:1 and only
 * resolves the palette for the active light/dark theme.
 */

export type SpecularCtaVariant = "accent" | "neutral";
export type SpecularCtaSize = "sm" | "md" | "lg";

/** Full pass-through of the original SpecularButton props (props table). */
export interface SpecularCtaProps {
  children?: ReactNode;
  /** Native button tooltip/label — passes through via ...rest. */
  title?: string;
  /** Consistent CTA scale: `md` = hero, `sm` = nav / cards / modals / toolbar. */
  size?: SpecularCtaSize;
  variant?: SpecularCtaVariant;
  /** Editor control rule (`rounded-[4px]`), applied to all CTAs. */
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  idleIntensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  glow?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
  speed?: number;
  disabled?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  className?: string;
  style?: CSSProperties;
}

interface CtaPalette {
  tint: string;
  tintOpacity: number;
  textColor: string;
  lineColor: string;
  baseColor: string;
}

/* Concrete hex pairs per theme/variant. The shader probes colors through a
   2d canvas (`fillStyle` → RGB), so CSS variables can't be used here — these
   mirror the globals.css tokens (accent #22C55E, zinc foreground/card). */
const PALETTE: Record<"dark" | "light", Record<SpecularCtaVariant, CtaPalette>> = {
  dark: {
    // Green glass body + brand-green specular edge on near-black zinc.
    accent: { tint: ACCENT, tintOpacity: 0.1, textColor: "#F4F4F5", lineColor: "#4ADE80", baseColor: "#2E5F45" },
    // Original React Bits look, verbatim on the dark canvas.
    neutral: { tint: "#FFFFFF", tintOpacity: 0.04, textColor: "#F5F5F5", lineColor: "#FFFFFF", baseColor: "#525252" },
  },
  light: {
    // Light green glass on the zinc-50 canvas; green-600 edge stays visible.
    accent: { tint: ACCENT, tintOpacity: 0.12, textColor: "#0A0A0A", lineColor: "#16A34A", baseColor: "#71717A" },
    // Subtle smoke glass — the light-mode translation of the dark chip.
    neutral: { tint: "#18181B", tintOpacity: 0.05, textColor: "#18181B", lineColor: "#18181B", baseColor: "#71717A" },
  },
};

export function SpecularCta({
  children,
  size = "md",
  variant = "accent",
  radius = 4,
  tint,
  tintOpacity,
  textColor,
  lineColor,
  baseColor,
  proximity,
  ...rest
}: SpecularCtaProps) {
  const { theme } = useTheme();
  const palette = PALETTE[theme][variant];

  return (
    <SpecularButton
      size={size}
      radius={radius}
      tint={tint ?? palette.tint}
      tintOpacity={tintOpacity ?? palette.tintOpacity}
      textColor={textColor ?? palette.textColor}
      lineColor={lineColor ?? palette.lineColor}
      baseColor={baseColor ?? palette.baseColor}
      proximity={proximity ?? (size === "sm" ? 180 : 250)}
      {...rest}
    >
      {children}
    </SpecularButton>
  );
}

export default SpecularCta;
