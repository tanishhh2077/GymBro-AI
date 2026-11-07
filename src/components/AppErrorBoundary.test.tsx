import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { AppErrorBoundary } from "./AppErrorBoundary";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
beforeEach(() => {
  // React reports a caught render error to the console; the test expects one.
  vi.spyOn(console, "error").mockImplementation(() => {});
  container = document.createElement("div"); document.body.append(container); root = createRoot(container);
});
afterEach(async () => { await act(async () => root.unmount()); document.body.replaceChildren(); vi.restoreAllMocks(); });

function Crash(): never { throw new Error("secret-internal-detail at src/Foo.tsx:12"); }

it("renders its children when nothing fails", async () => {
  await act(async () => root.render(<AppErrorBoundary><p>All good</p></AppErrorBoundary>));
  expect(container.textContent).toBe("All good");
  expect(container.querySelector('[role="alert"]')).toBeNull();
});

it("shows a plain recovery screen without the error details", async () => {
  await act(async () => root.render(<AppErrorBoundary><Crash /></AppErrorBoundary>));
  const alert = container.querySelector('[role="alert"]');
  expect(alert?.textContent).toContain("Something went wrong");
  expect(alert?.textContent).toContain("Workouts you already saved");
  expect(container.textContent).not.toContain("secret-internal-detail");
  expect(container.textContent).not.toContain("Foo.tsx");
});

it("reloads the app from its button", async () => {
  const reload = vi.fn();
  vi.stubGlobal("location", { ...window.location, reload });
  await act(async () => root.render(<AppErrorBoundary><Crash /></AppErrorBoundary>));
  const button = [...container.querySelectorAll("button")].find((el) => el.textContent === "Reload app");
  await act(async () => { button!.click(); });
  expect(reload).toHaveBeenCalledOnce();
  vi.unstubAllGlobals();
});
