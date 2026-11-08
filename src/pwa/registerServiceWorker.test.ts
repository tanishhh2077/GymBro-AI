import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker, type RegistrationEnvironment } from "./registerServiceWorker";

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
});
