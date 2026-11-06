import { afterEach, expect, it, vi } from 'vitest';

const vision = vi.hoisted(() => ({ loads: 0 }));
vi.mock('@mediapipe/tasks-vision', () => {
  vision.loads++;
  return {
    FilesetResolver: { forVisionTasks: vi.fn(async () => { throw new Error('no runtime in this test'); }) },
    PoseLandmarker: { createFromOptions: vi.fn() },
  };
});
afterEach(() => { vi.doUnmock('@mediapipe/tasks-vision'); vi.resetModules(); vision.loads = 0; });

function video() {
  const element = document.createElement('video');
  Object.defineProperties(element, {
    duration: { value: 0.2 }, videoWidth: { value: 640 }, videoHeight: { value: 360 }, readyState: { value: 2 },
  });
  return element;
}

it('loads MediaPipe only when processing first needs a detector', async () => {
  const { PoseEngine } = await import('./PoseEngine');
  const engine = new PoseEngine();
  expect(vision.loads).toBe(0);
  await expect(engine.processVideo(video(), { targetFps: 1 })).rejects.toMatchObject({ kind: 'init' });
  expect(vision.loads).toBe(1);
  engine.close();
});

it('reports a library-load failure as a typed initialization error', async () => {
  vi.doMock('@mediapipe/tasks-vision', () => { throw new Error('chunk unavailable'); });
  const { PoseEngine } = await import('./PoseEngine');
  const engine = new PoseEngine();
  await expect(engine.processVideo(video(), { targetFps: 1 })).rejects.toMatchObject({
    kind: 'init', message: expect.stringContaining('Failed to load the pose-estimation library'),
  });
  engine.close();
});

it('cancels a pending library import before it can acquire the runtime or a detector', async () => {
  let finishImport!: () => void;
  let requested = false;
  const gate = new Promise<void>(resolve => { finishImport = resolve; });
  const runtime = vi.fn(async () => { throw new Error('Runtime should not be acquired'); });
  vi.doMock('@mediapipe/tasks-vision', async () => {
    requested = true;
    await gate;
    return { FilesetResolver: { forVisionTasks: runtime }, PoseLandmarker: { createFromOptions: vi.fn() } };
  });
  const { PoseEngine } = await import('./PoseEngine');
  const engine = new PoseEngine();
  const controller = new AbortController();
  const outcome = engine.init({ signal: controller.signal, timeoutMs: 10_000 }).then(
    () => ({ status: 'fulfilled' }), reason => ({ status: 'rejected', reason }),
  );
  await vi.waitFor(() => expect(requested).toBe(true));
  controller.abort();
  await expect(outcome).resolves.toMatchObject({ status: 'rejected', reason: { kind: 'aborted' } });
  finishImport(); await import('@mediapipe/tasks-vision'); await Promise.resolve();
  expect(runtime).not.toHaveBeenCalled();
  engine.close();
});
