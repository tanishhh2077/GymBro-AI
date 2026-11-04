import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Capacitor } from "@capacitor/core";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import App from "./App";

const native = vi.hoisted(() => ({
  listeners: [] as Array<{ callback: (state: { isActive: boolean }) => void; remove: ReturnType<typeof vi.fn> }>,
}));
vi.mock("@capacitor/app", () => ({
  App: {
    addListener: (_event: string, callback: (state: { isActive: boolean }) => void) => {
      const remove = vi.fn(async () => {});
      native.listeners.push({ callback, remove });
      return Promise.resolve({ remove });
    },
  },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
beforeEach(() => {
  native.listeners = [];
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(true);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    this.dataset.paused = "yes";
  });
  const container = document.createElement("div"); document.body.append(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => { root.unmount(); });
  document.body.replaceChildren(); vi.restoreAllMocks();
});

it("connects native background pausing and owns both StrictMode registrations", async () => {
  await act(async () => { root.render(<StrictMode><App /></StrictMode>); });
  expect(native.listeners).toHaveLength(2);
  expect(native.listeners[0].remove).toHaveBeenCalledOnce();
  const video = document.createElement("video"); document.body.append(video);
  native.listeners[0].callback({ isActive: false });
  expect(video.dataset.paused).toBeUndefined();
  native.listeners[1].callback({ isActive: false });
  expect(video.dataset.paused).toBe("yes");
  await act(async () => { root.unmount(); });
  expect(native.listeners[1].remove).toHaveBeenCalledOnce();
});

it("does not register native background behavior in the browser app", async () => {
  vi.mocked(Capacitor.isNativePlatform).mockReturnValue(false);
  await act(async () => { root.render(<App />); });
  expect(native.listeners).toHaveLength(0);
});
