import { describe, expect, it, vi } from "vitest";
import {
  registerServiceWorker, registerServiceWorkerAfterLoad, type RegistrationEnvironment,
} from "./registerServiceWorker";

function environment(overrides: Partial<RegistrationEnvironment> = {}) {
  const register = vi.fn(async () => ({}));
  const warn = vi.fn();
  const env: RegistrationEnvironment = {
    isProduction: true, isNative: false, isSecureContext: true, baseUrl: "/",
    serviceWorker: { register }, warn, ...overrides,
  };
  return { env, register, warn };
}

describe("registerServiceWorker", () => {
  it("registers the built worker for the app's base path on the secure web", async () => {
    const { env, register } = environment({ baseUrl: "/app/" });
    await expect(registerServiceWorker(env)).resolves.toBe(true);
    expect(register).toHaveBeenCalledWith("/app/sw.js", { scope: "/app/" });
  });
  it.each([
    ["inside the native app", { isNative: true }],
    ["on the development server", { isProduction: false }],
    ["on an insecure origin", { isSecureContext: false }],
    ["without service worker support", { serviceWorker: undefined }],
  ])("does not register %s", async (_label, overrides) => {
    const { env, register } = environment(overrides);
    await expect(registerServiceWorker(env)).resolves.toBe(false);
    expect(register).not.toHaveBeenCalled();
  });
  it("only warns when registration fails", async () => {
    const { env, warn } = environment({
      serviceWorker: { register: vi.fn(async () => { throw new Error("blocked"); }) },
    });
    await expect(registerServiceWorker(env)).resolves.toBe(false);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/offline/i));
  });
  it("only warns when the native check itself throws", async () => {
    const { env, register, warn } = environment();
    Object.defineProperty(env, "isNative", { get: () => { throw new Error("bridge"); } });
    await expect(registerServiceWorker(env)).resolves.toBe(false);
    expect(register).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalled();
  });
  it("handles parallel registration calls cleanly", async () => {
    const { env, register } = environment({ baseUrl: "/app/" });
    const results = await Promise.all([registerServiceWorker(env), registerServiceWorker(env)]);
    expect(results).toEqual([true, true]);
    expect(register).toHaveBeenCalledTimes(2);
  });
  it("registers correctly for deep sub-paths and relative base paths", async () => {
    const deep = environment({ baseUrl: "/gym/sub/path/" });
    await expect(registerServiceWorker(deep.env)).resolves.toBe(true);
    expect(deep.register).toHaveBeenCalledWith("/gym/sub/path/sw.js", { scope: "/gym/sub/path/" });

    const relative = environment({ baseUrl: "./" });
    await expect(registerServiceWorker(relative.env)).resolves.toBe(true);
    expect(relative.register).toHaveBeenCalledWith("./sw.js", { scope: "./" });
  });
  it("warns without throwing when registration rejects with QuotaExceededError or SecurityError", async () => {
    const quota = environment({
      serviceWorker: {
        register: vi.fn(async () => {
          throw new DOMException("Quota exceeded", "QuotaExceededError");
        }),
      },
    });
    await expect(registerServiceWorker(quota.env)).resolves.toBe(false);
    expect(quota.warn).toHaveBeenCalledWith(expect.stringMatching(/offline/i));

    const security = environment({
      serviceWorker: {
        register: vi.fn(async () => {
          throw new DOMException("The operation is insecure.", "SecurityError");
        }),
      },
    });
    await expect(registerServiceWorker(security.env)).resolves.toBe(false);
    expect(security.warn).toHaveBeenCalledWith(expect.stringMatching(/offline/i));
  });
});

describe("registerServiceWorkerAfterLoad", () => {
  it("registers immediately when document.readyState is complete", () => {
    const originalReadyState = document.readyState;
    Object.defineProperty(document, "readyState", { value: "complete", configurable: true });
    const addEventListenerSpy = vi.spyOn(window, "addEventListener");
    try {
      registerServiceWorkerAfterLoad();
      expect(addEventListenerSpy).not.toHaveBeenCalledWith("load", expect.any(Function), expect.any(Object));
    } finally {
      Object.defineProperty(document, "readyState", { value: originalReadyState, configurable: true });
      addEventListenerSpy.mockRestore();
    }
  });

  it("defers registration to window load event when document is still loading", () => {
    const originalReadyState = document.readyState;
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });
    let loadHandler: (() => void) | undefined;
    const addEventListenerSpy = vi.spyOn(window, "addEventListener").mockImplementation((type, handler) => {
      if (type === "load") loadHandler = handler as () => void;
    });
    try {
      registerServiceWorkerAfterLoad();
      expect(loadHandler).toBeDefined();
    } finally {
      Object.defineProperty(document, "readyState", { value: originalReadyState, configurable: true });
      addEventListenerSpy.mockRestore();
    }
  });
});
