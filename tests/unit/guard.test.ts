import { beforeEach, expect, it, vi } from "vitest"
import { guard } from "../../src/api/guard"
const user = vi.fn(),
  allows = vi.fn(),
  principal = vi.fn(),
  context = vi.fn()
let registered: boolean, req: any, res: any, next: any
beforeEach(() => {
  registered = true
  user.mockReset().mockResolvedValue({ id: "staff" })
  allows.mockReset().mockReturnValue(true)
  principal
    .mockReset()
    .mockResolvedValue({ actor_id: "staff", actor_type: "user", active: true })
  context.mockReset().mockResolvedValue({ trusted: true })
  req = {
    auth_context: { actor_type: "user", actor_id: "staff" },
    method: "GET",
    path: "/admin/catalog-images/collection/owner",
    params: { kind: "collection" },
    scope: {
      hasRegistration: () => registered,
      resolve: (name: string) =>
        name === "user"
          ? { retrieveUser: user }
          : {
              principalForRequest: principal,
              permissionContext: context,
              allows,
            },
    },
  }
  res = { status: vi.fn(), json: vi.fn() }
  res.status.mockReturnValue(res)
  next = vi.fn()
})
it("requires a real authenticated native staff owner", async () => {
  for (const auth of [
    undefined,
    { actor_type: "customer", actor_id: "staff" },
    { actor_type: "user" },
  ]) {
    req.auth_context = auth
    await guard(req, res, next)
    expect(res.status).toHaveBeenLastCalledWith(401)
  }
  expect(next).not.toHaveBeenCalled()
})
it("supports native staff authorization when the optional RBAC adapter is absent", async () => {
  registered = false
  await guard(req, res, next)
  expect(next).toHaveBeenCalledWith()
  expect(user).toHaveBeenCalledWith("staff", { select: ["id"] })
  expect(principal).not.toHaveBeenCalled()
})
it("checks entity permissions and requires product view for member media", async () => {
  await guard(req, res, next)
  expect(allows).toHaveBeenCalledWith(expect.anything(), "collections.view", {
    trusted: true,
  })
  req.params.kind = "category"
  req.method = "POST"
  await guard(req, res, next)
  expect(allows).toHaveBeenLastCalledWith(
    expect.anything(),
    "categories.manage",
    { trusted: true }
  )
  req.method = "GET"
  req.path += "/media"
  await guard(req, res, next)
  expect(allows).toHaveBeenLastCalledWith(expect.anything(), "products.view", {
    trusted: true,
  })
  allows.mockReturnValue(false)
  await guard(req, res, next)
  expect(res.status).toHaveBeenCalledWith(403)
})
it("refuses inactive, mismatched and foreign actor principals", async () => {
  for (const value of [
    null,
    { actor_id: "other", actor_type: "user", active: true },
    { actor_id: "staff", actor_type: "customer", active: true },
    { actor_id: "staff", actor_type: "user", active: false },
  ]) {
    principal.mockResolvedValueOnce(value)
    await guard(req, res, next)
    expect(res.status).toHaveBeenLastCalledWith(403)
  }
  expect(next).not.toHaveBeenCalled()
})
it("does not broaden unknown operations or swallow ownership failures", async () => {
  req.method = "DELETE"
  await guard(req, res, next)
  expect(res.status).toHaveBeenCalledWith(403)
  req.method = "GET"
  req.params.kind = "product"
  await guard(req, res, next)
  expect(next).toHaveBeenCalledWith(
    expect.objectContaining({ message: "Unknown artwork type" })
  )
  user.mockRejectedValueOnce(new Error("Missing staff"))
  await guard(req, res, next)
  expect(next).toHaveBeenLastCalledWith(
    expect.objectContaining({ message: "Missing staff" })
  )
})
