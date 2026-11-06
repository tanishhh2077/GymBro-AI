import { afterEach, expect, it, vi } from "vitest";

// Vitest runs this factory only when the module is first imported, so the count
// shows whether PoseEngine loads MediaPipe eagerly or on first detector creation.
const vision = vi.hoisted(() => ({ loads: 0 }));
vi.mock("@mediapipe/tasks-vision", () => {
  vision.loads++;
  return {
    FilesetResolver: { forVisionTasks: vi.fn(async () => { throw new Error("no runtime in this test"); }) },
    PoseLandmarker: { createFromOptions: vi.fn() },
  };
});

afterEach(() => { vi.doUnmock("@mediapipe/tasks-vision"); vi.resetModules(); vision.loads = 0; });

/** A decodable-looking video whose metadata passes the input limits. */
function video() {
  const element = document.createElement("video");
  Object.defineProperties(element, {
    duration: { value: 0.2 },
    videoWidth: { value: 640 },
    videoHeight: { value: 360 },
    readyState: { value: 2 },
  });
  return element;
}

it("loads MediaPipe only when processing first needs a detector", async () => {
  const { PoseEngine } = await import("./PoseEngine");
  const engine = new PoseEngine();
  expect(vision.loads).toBe(0);

  await expect(engine.processVideo(video(), { targetFps: 1 })).rejects.toMatchObject({ kind: "init" });
  expect(vision.loads).toBe(1);
  engine.close();
});

it("reports a library that cannot be loaded as a typed initialization failure", async () => {
  // A fresh factory: resetModules does not clear the mock registry.
  vi.doMock("@mediapipe/tasks-vision", () => { throw new Error("chunk unavailable"); });
  const { PoseEngine } = await import("./PoseEngine");
  const engine = new PoseEngine();

  await expect(engine.processVideo(video(), { targetFps: 1 })).rejects.toMatchObject({
    kind: "init",
    message: expect.stringContaining("Failed to load the pose-estimation library"),
  });
  engine.close();
});
