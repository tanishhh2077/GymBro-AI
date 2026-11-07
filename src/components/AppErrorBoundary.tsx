import { Component, type ReactNode } from "react";

/**
 * Last-resort screen for an unexpected render error, so the user sees a way
 * forward instead of a blank page. It never shows the error itself: stack
 * traces and file paths mean nothing to a lifter and are not for display.
 * The caught error still reaches the console through React.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="mx-auto max-w-md p-6 pt-16" role="alert">
        <h1 className="text-2xl font-bold text-white">Something went wrong</h1>
        <p className="mt-3 text-sm text-slate-300">
          Workouts you already saved are stored on this device and this error does not change them.
          Anything you were typing and had not saved may be lost.
        </p>
        <button type="button" className="btn-primary mt-5" onClick={() => window.location.reload()}>Reload app</button>
      </div>
    );
  }
}
