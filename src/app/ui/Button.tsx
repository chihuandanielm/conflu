import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-blue text-white hover:bg-blue-hover disabled:bg-border-strong disabled:text-white",
  secondary: "border border-border-strong bg-bg text-ink hover:bg-surface",
  ghost: "text-blue hover:bg-blue-tint",
};

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-base font-semibold transition-colors duration-150 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
