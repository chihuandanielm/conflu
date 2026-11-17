import type { ButtonHTMLAttributes } from "react";

/** design/tokens.css: solid (the one call to action per screen), outline, and text (an underlined link-like button). */
export type Variant = "solid" | "outline" | "text";
const styles: Record<Variant, string> = { solid: "btn btn--solid", outline: "btn", text: "btn btn--text" };

export function Button({ variant = "solid", small = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  return <button type="button" className={`${styles[variant]}${small ? " btn--small" : ""} ${className}`.trim()} {...props} />;
}
