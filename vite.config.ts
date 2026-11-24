/// <reference types="vitest/config" />
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

/**
 * GitHub Pages can't send response headers, so the Content-Security-Policy ships as a <meta> tag in production builds.
 * (Dev builds skip it: Vite's dev server injects inline scripts for hot reload.)
 *  - 'wasm-unsafe-eval' lets the PDF library compile its WebAssembly layout engine. It does not allow JavaScript eval.
 *  - connect-src data: lets that engine read its WebAssembly module, which ships inline as a data: URL.
 * form-action allows only Formspree, for the feedback form (src/app/feedback/), a plain form post with no script.
 * frame-ancestors can't be set from a meta tag; GitHub Pages doesn't allow framing headers either.
 */
export const CSP = [
  "default-src 'self'", "script-src 'self' 'wasm-unsafe-eval'", "style-src 'self'", "img-src 'self' data:",
  "font-src 'self'", "connect-src 'self' data:", "object-src 'none'", "base-uri 'none'", "form-action https://formspree.io",
].join("; ");

function cspMeta(): Plugin {
  return {
    name: "csp-meta",
    apply: "build",
    transformIndexHtml: () => [{ tag: "meta", attrs: { "http-equiv": "Content-Security-Policy", content: CSP }, injectTo: "head-prepend" }],
  };
}

// Project sites on GitHub Pages live under /<repo>/; the deploy workflow sets BASE_PATH. Local builds use "/".
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react(), tailwindcss(), cspMeta()],
  build: { target: "es2022", sourcemap: false },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    setupFiles: ["src/app/test-setup.ts"],
    css: false,
  },
});
