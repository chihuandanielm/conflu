// A tab opened before a redeploy still points at the old build's file names. GitHub Pages only serves the new build,
// so the parts that load on demand (the PDF maker) fail to load. Only a reload fixes that;
// saved answers and the plan live in localStorage, so reloading loses nothing.
import { Component, type ReactNode } from "react";

const STALE = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk .* failed|ChunkLoadError/i;

export function isStaleBuildError(e: unknown): boolean {
  return e instanceof Error && STALE.test(`${e.name}: ${e.message}`);
}

export const STALE_MESSAGE = "The site was updated after you opened this page. Reload to get the latest version; your plan is saved.";

export function ReloadNotice({ id, children = STALE_MESSAGE }: { id?: string; children?: ReactNode }) {
  return (
    <div id={id} role="alert" className="notice flex flex-wrap items-center gap-3 text-small">
      <span>{children}</span>
      <button type="button" onClick={() => window.location.reload()} className="btn btn--small">Reload page</button>
    </div>
  );
}

/** Wraps a lazily loaded part of the page: a stale build gets a reload prompt, any other failure gets `fallback`. */
export class ChunkBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { error: unknown }> {
  state: { error: unknown } = { error: null };
  static getDerivedStateFromError(error: unknown) { return { error }; }
  componentDidCatch(error: unknown) { console.error("Part of the page failed to load", error); }
  render() {
    if (!this.state.error) return this.props.children;
    return isStaleBuildError(this.state.error)
      ? <ReloadNotice />
      : this.props.fallback;
  }
}
