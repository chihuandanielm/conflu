/** Jump to the top of the page at once (used while a screen is invisible between fades). jsdom has no scrolling. */
export function toTop(): void {
  if (typeof window === "undefined" || /jsdom/i.test(navigator.userAgent)) return;
  window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
}
