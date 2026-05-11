import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-space shadow-[0_0_24px_-4px_rgba(45,212,160,0.45)] hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  secondary:
    "border border-white/15 bg-white/5 text-ink backdrop-blur-sm hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/30",
  ghost:
    "bg-transparent text-slate-300 hover:bg-white/5 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/25",
};

const base =
  "inline-flex cursor-pointer items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-[color,background-color,box-shadow,filter] disabled:pointer-events-none disabled:opacity-50";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
  to?: string;
};

export function Button({
  variant = "primary",
  className = "",
  children,
  to,
  ...props
}: Props) {
  const cls = `${base} ${variants[variant]} ${className}`;
  if (to) {
    return (
      <Link to={to} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}
