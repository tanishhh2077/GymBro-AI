import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SelectionIssue } from "@/core/clipPolicy";
import { ClipDropzone } from "./ClipDropzone";

// Tells React this environment runs updates inside act().
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

function render(onSelect: (file: File) => SelectionIssue | null, disabled = false) {
  act(() => root.render(<ClipDropzone onSelect={onSelect} disabled={disabled} />));
}

function mp4(name = "bench.mp4", size = 1_000) {
  return new File([new Uint8Array(size)], name, { type: "video/mp4" });
}

function find<T extends Element>(selector: string): T {
  const element = container.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}

const fileInput = () => find<HTMLInputElement>('input[type="file"]');
const chooseButton = () => find<HTMLButtonElement>("button");
const dropArea = () => find<HTMLElement>('[aria-label="Video drop area"]');
const alertBox = () => container.querySelector('[role="alert"]');

/** The alert's accessible name, from the element its aria-labelledby points to. */
function alertName(alert: Element) {
  const id = alert.getAttribute("aria-labelledby");
  return id ? document.getElementById(id)?.textContent : null;
}

// jsdom cannot build a FileList, so the input's files are replaced with an array.
function choose(files: File[]) {
  const input = fileInput();
  Object.defineProperty(input, "files", { value: files, configurable: true });
  act(() => { input.dispatchEvent(new Event("change", { bubbles: true })); });
}

function drop(files: File[]) {
  const event = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(event, "dataTransfer", { value: { files } });
  act(() => { dropArea().dispatchEvent(event); });
  return event;
}

describe("ClipDropzone", () => {
  it("hands one valid MP4 to onSelect exactly once and shows no alert", () => {
    const onSelect = vi.fn<(file: File) => SelectionIssue | null>(() => null);
    render(onSelect);
    const file = mp4();

    choose([file]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith(file);
    expect(alertBox()).toBeNull();
  });

  it("hands a valid single-file drop to onSelect exactly once", () => {
    const onSelect = vi.fn<(file: File) => SelectionIssue | null>(() => null);
    render(onSelect);

    const event = drop([mp4()]);
    expect(event.defaultPrevented).toBe(true);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("shows a named alert for a non-MP4 file without calling onSelect", () => {
    const onSelect = vi.fn<(file: File) => SelectionIssue | null>(() => null);
    render(onSelect);

    choose([mp4("set.mov")]);
    expect(onSelect).not.toHaveBeenCalled();
    const alert = alertBox();
    expect(alert).not.toBeNull();
    if (alert) {
      expect(alertName(alert)).toBe("Video not accepted");
      expect(alert.textContent).toContain(".mp4");
    }
  });

  it("rejects a multiple-file drop with a named alert instead of picking one", () => {
    const onSelect = vi.fn<(file: File) => SelectionIssue | null>(() => null);
    render(onSelect);

    const event = drop([mp4("a.mp4"), mp4("b.mp4")]);
    expect(event.defaultPrevented).toBe(true);
    expect(onSelect).not.toHaveBeenCalled();
    const alert = alertBox();
    expect(alert && alertName(alert)).toBe("Video not accepted");
    expect(alert?.textContent).toContain("only one");
  });

  it("shows the session's rejection returned by onSelect", () => {
    const onSelect = vi.fn<(file: File) => SelectionIssue | null>(() => ({
      code: "busy", message: "Remove the current clip before choosing another.",
    }));
    render(onSelect);

    choose([mp4()]);
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(alertBox()?.textContent).toContain("Remove the current clip before choosing another.");
  });

  it("clears the alert after a later valid selection", () => {
    const onSelect = vi.fn<(file: File) => SelectionIssue | null>(() => null);
    render(onSelect);

    choose([mp4("set.webm")]);
    expect(alertBox()).not.toBeNull();
    choose([mp4()]);
    expect(alertBox()).toBeNull();
  });

  it("opens the file picker from a keyboard-operable button", () => {
    render(() => null);
    const click = vi.spyOn(fileInput(), "click").mockImplementation(() => {});

    act(() => chooseButton().click());
    expect(click).toHaveBeenCalledTimes(1);
    expect(chooseButton().textContent).toContain("Choose video");
  });

  it("blocks the button, the file input, and drops while admission is disabled", () => {
    const onSelect = vi.fn<(file: File) => SelectionIssue | null>(() => null);
    render(onSelect, true);
    const click = vi.spyOn(fileInput(), "click").mockImplementation(() => {});

    // A disabled button cannot be focused or activated from the keyboard.
    expect(chooseButton().disabled).toBe(true);
    expect(fileInput().disabled).toBe(true);
    act(() => chooseButton().click());
    choose([mp4()]);
    const event = drop([mp4()]);

    expect(click).not.toHaveBeenCalled();
    expect(onSelect).not.toHaveBeenCalled();
    // The browser must still not open the dropped file itself.
    expect(event.defaultPrevented).toBe(true);
  });

  it("offers no camera-angle choice", () => {
    render(() => null);
    expect(container.querySelectorAll("[aria-pressed]")).toHaveLength(0);
    expect(container.textContent).not.toMatch(/camera angle/i);
  });
});
