import { afterEach, it, expect, vi } from "vitest"
const ctor = vi.hoisted(() => vi.fn())
vi.mock("@medusajs/js-sdk", () => ({
  default: class {
    constructor(options: unknown) {
      ctor(options)
    }
  },
}))
afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
  ctor.mockClear()
})
it("uses native Admin defaults when no bundled override exists", async () => {
  await import("../../src/admin/lib/client.js")
  expect(ctor).toHaveBeenCalledWith({
    baseUrl: "/",
    auth: { type: "session", jwtTokenStorageKey: undefined },
  })
})
it("honors the configured backend, JWT mode and token storage key", async () => {
  vi.stubGlobal("__BACKEND_URL__", "https://admin.example.test")
  vi.stubGlobal("__AUTH_TYPE__", "jwt")
  vi.stubGlobal("__JWT_TOKEN_STORAGE_KEY__", "merchant-admin")
  await import("../../src/admin/lib/client.js")
  expect(ctor).toHaveBeenCalledWith({
    baseUrl: "https://admin.example.test",
    auth: { type: "jwt", jwtTokenStorageKey: "merchant-admin" },
  })
})
