import type { CSSProperties, JSX, MouseEventHandler, ReactNode } from "react";

/**
 * Types for the runtime `SpecularButton.jsx` (React Bits, JS + CSS variant).
 * Declared here so TypeScript consumers get a fully typed module — the JSX
 * source itself stays untouched.
 */
export interface SpecularButtonProps {
  children?: ReactNode;
  /** Native button tooltip/label — spread onto the <button> along with the
      rest of the caller's extra props. */
  title?: string;
  size?: "sm" | "md" | "lg";
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

declare function SpecularButton(props: SpecularButtonProps): JSX.Element;

export default SpecularButton;
