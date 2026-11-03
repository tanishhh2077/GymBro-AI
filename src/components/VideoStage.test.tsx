import { act, StrictMode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Clip } from "@/types";
import { VideoStage } from "./VideoStage";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let container: HTMLDivElement;
let root: Root;
let retain: ReturnType<typeof vi.fn<(id: string) => () => void>>;
let releases: Array<{ attached: boolean; paused: boolean }>;
let states: WeakMap<HTMLMediaElement, { paused: boolean; duration: number }>;

function state(video: HTMLMediaElement) {
  let value = states.get(video);
  if (!value) { value = { paused: true, duration: 5 }; states.set(video, value); }
  return value;
}

function clip(status: Clip["status"] = "ready", id = "a"): Clip {
  return {
    id, name: "bench.mp4", source: "upload", angle: "side", url: `blob:${id}`, status,
    pose: {
      frames: [{ index: 0, time: 0, landmarks: null, worldLandmarks: null }],
      fps: 30, duration: 5, width: 1600, height: 900, delegate: "GPU",
      coverage: { totalFrames: 1, framesWithPose: 0, detectionRate: 0, meanVisibility: 0 },
    },
  };
}

function render(value = clip(), strict = false) {
  const stage = <VideoStage clip={value} retainMedia={retain} />;
  act(() => root.render(strict ? <StrictMode>{stage}</StrictMode> : stage));
}

function find<T extends Element>(selector: string): T {
  const element = container.querySelector<T>(selector);
  if (!element) throw new Error(`Missing element: ${selector}`);
  return element;
}
const video = () => find<HTMLVideoElement>("video");
const range = () => find<HTMLInputElement>('input[type="range"]');
const play = () => find<HTMLButtonElement>('button[aria-label="Play"]');
const restart = () => find<HTMLButtonElement>('button[aria-label="Restart"]');
const alert = () => container.querySelector('[role="alert"]');
function emit(type: string) { act(() => { video().dispatchEvent(new Event(type)); }); }
async function click(button: HTMLButtonElement) { await act(async () => { button.click(); }); }

beforeEach(() => {
  states = new WeakMap();
  releases = [];
  retain = vi.fn(() => () => {
    const element = container.querySelector("video");
    releases.push({ attached: !!element?.getAttribute("src"), paused: !element || state(element).paused });
  });
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  vi.spyOn(HTMLMediaElement.prototype, "paused", "get").mockImplementation(function (this: HTMLMediaElement) { return state(this).paused; });
  vi.spyOn(HTMLMediaElement.prototype, "duration", "get").mockImplementation(function (this: HTMLMediaElement) { return state(this).duration; });
  vi.spyOn(HTMLMediaElement.prototype, "load").mockImplementation(() => {});
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function (this: HTMLMediaElement) {
    state(this).paused = true; this.dispatchEvent(new Event("pause"));
  });
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function (this: HTMLMediaElement) {
    state(this).paused = false; this.dispatchEvent(new Event("play")); return Promise.resolve();
  });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe("VideoStage", () => {
  it("names the seek control and reports selected playback speed without color", async () => {
    render();
    expect(range().getAttribute("aria-label")).toBeTruthy();
    const half = [...container.querySelectorAll("button")].find(button => button.textContent === "0.5×")!;
    await click(half);
    expect(half.getAttribute("aria-pressed")).toBe("true");
    expect(video().playbackRate).toBe(.5);
    expect([...container.querySelectorAll('[aria-pressed="true"]')]).toEqual([half]);
  });

  it("synchronizes paused scrubbing to the actual seeked position", () => {
    render();
    emit("loadedmetadata");
    const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
    act(() => {
      setValue.call(range(), "2");
      range().dispatchEvent(new Event("input", { bubbles: true }));
    });
    expect(video().currentTime).toBe(2);
    video().currentTime = 1.25;
    emit("seeked");
    expect(Number(range().value)).toBe(1.25);
    expect(state(video()).paused).toBe(true);
  });

  it.each(["play", "restart"] as const)("shows actionable feedback after rejected %s", async (action) => {
    render();
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("Playback blocked"));
    await click(action === "play" ? play() : restart());
    expect(alert()?.textContent).toMatch(/playback/i);
    expect(alert()?.textContent).toMatch(/try|remove/i);
    expect(play().disabled).toBe(false);
  });

  it("clears the playback failure after a successful retry", async () => {
    render();
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("Blocked"));
    await click(play());
    expect(alert()).not.toBeNull();
    await click(play());
    expect(alert()).toBeNull();
    expect(find<HTMLButtonElement>('button[aria-label="Pause"]')).toBeTruthy();
  });

  it("updates restart time even if playback cannot start", async () => {
    render();
    emit("loadedmetadata");
    video().currentTime = 3;
    emit("timeupdate");
    vi.mocked(HTMLMediaElement.prototype.play).mockRejectedValueOnce(new Error("Blocked"));
    await click(restart());
    expect(video().currentTime).toBe(0);
    expect(Number(range().value)).toBe(0);
  });

  it("keeps an existing live region when a completed clip has no pose", async () => {
    render(clip("pending"));
    const region = container.querySelector('[role="status"]');
    expect(region).not.toBeNull();
    expect(region?.textContent).toBe("");
    render(clip("no-pose"));
    expect(container.querySelector('[role="status"]')).toBe(region);
    expect(region?.textContent).toMatch(/no pose detected/i);
    expect(play().disabled).toBe(false);
    expect(container.querySelector("canvas")).toBeNull();
    await click(play());
    expect(state(video()).paused).toBe(false);
  });

  it("labels target sampling and detection without source-fps or form-quality claims", () => {
    const value = clip();
    value.pose!.coverage.detectionRate = .5;
    render(value);
    expect(container.textContent).toMatch(/sampling target/i);
    expect(container.textContent).toContain("30 samples/s");
    expect(container.textContent).toMatch(/50% of sampled positions/i);
    expect(container.textContent).not.toMatch(/30fps|form score/i);
  });

  it("pins contain-fit and uses finite duration when browser metadata is unavailable", () => {
    render();
    state(video()).duration = Infinity;
    emit("loadedmetadata");
    expect(video().style.objectFit).toBe("contain");
    expect(Number(range().max)).toBe(5);
  });

  it("resets player state for a replacement source and ignores a late old play rejection", async () => {
    render();
    emit("loadedmetadata");
    video().currentTime = 3;
    emit("timeupdate");
    let reject!: (reason: Error) => void;
    vi.mocked(HTMLMediaElement.prototype.play).mockReturnValueOnce(new Promise<void>((_resolve, no) => { reject = no; }));
    await click(play());
    render(clip("ready", "b"));
    await act(async () => { reject(new Error("Old request")); });
    expect(video().getAttribute("src")).toBe("blob:b");
    expect(Number(range().value)).toBe(0);
    expect(alert()).toBeNull();
    expect(play().disabled).toBe(false);
  });

  it("detaches media before releasing a lease, including StrictMode setup/cleanup", () => {
    render(clip(), true);
    expect(retain).toHaveBeenCalledTimes(2);
    expect(video().getAttribute("src")).toBe("blob:a");
    expect(releases).toEqual([{ attached: false, paused: true }]);
    act(() => root.render(null));
    expect(releases).toEqual([{ attached: false, paused: true }, { attached: false, paused: true }]);
  });

  it("reflects real play, pause, and ended events", async () => {
    render(clip("no-pose"));
    await click(play());
    const pause = find<HTMLButtonElement>('button[aria-label="Pause"]');
    await click(pause);
    expect(play()).toBeTruthy();
    await click(play());
    state(video()).paused = true;
    emit("ended");
    expect(play()).toBeTruthy();
  });
});
