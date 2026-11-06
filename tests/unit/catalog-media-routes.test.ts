import { expect, it, vi } from "vitest"
const list = vi.hoisted(() => vi.fn())
vi.mock("../../src/catalog-images/media", () => ({ listMemberMedia: list }))
import { GET } from "../../src/api/admin/catalog-images/[kind]/[id]/media/route"
it("passes only server-validated member search to the current owner", async () => {
  const res: any = { setHeader: vi.fn(), json: vi.fn() },
    req: any = {
      scope: {},
      params: { kind: "category", id: "owner" },
      validatedQuery: { q: "member", offset: 12 },
    }
  list.mockResolvedValue({ products: [], count: 0 })
  await GET(req, res)
  expect(list).toHaveBeenCalledWith(
    req.scope,
    "category",
    "owner",
    "member",
    12
  )
  expect(res.setHeader).toHaveBeenCalledWith(
    "Cache-Control",
    "private, no-store"
  )
  expect(res.json).toHaveBeenCalledWith({ products: [], count: 0 })
})
