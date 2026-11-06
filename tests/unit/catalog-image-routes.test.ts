import { beforeEach, expect, it, vi } from "vitest"
const mock = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }))
vi.mock("../../src/catalog-images/service", () => ({
  imageKind: (s: string) => s,
  readArtwork: mock.read,
  saveArtwork: mock.save,
}))
vi.mock("../../src/catalog-images/media", () => ({
  saveSelectedArtwork: mock.save,
}))
import { GET, POST } from "../../src/api/admin/catalog-images/[kind]/[id]/route"
import { GET as storeGet } from "../../src/api/store/catalog-images/[kind]/[id]/route"
beforeEach(() => {
  vi.clearAllMocks()
  mock.read.mockResolvedValue({ url: null, revision: "private" })
  mock.save.mockResolvedValue({ url: null, revision: "new" })
})
it("uses validated commands and returns private Admin artwork without caching", async () => {
  const res: any = { setHeader: vi.fn(), json: vi.fn() }
  const req: any = {
    scope: {},
    params: { kind: "collection", id: "owner" },
    validatedBody: { url: null, revision: "old" },
  }
  await GET(req, res)
  expect(mock.read).toHaveBeenCalledWith(req.scope, "collection", "owner")
  await POST(req, res)
  expect(mock.save).toHaveBeenCalledWith(
    req.scope,
    "collection",
    "owner",
    req.validatedBody
  )
  expect(res.setHeader).toHaveBeenCalledWith(
    "Cache-Control",
    "private, no-store"
  )
})
it("exposes only public artwork, never revision or plugin metadata", async () => {
  const res: any = { setHeader: vi.fn(), json: vi.fn() }
  await storeGet(
    { scope: {}, params: { kind: "category", id: "owner" } } as any,
    res
  )
  expect(mock.read).toHaveBeenCalledWith({}, "category", "owner", true)
  expect(res.json).toHaveBeenCalledWith({ image: { url: null } })
  expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "no-store")
})
