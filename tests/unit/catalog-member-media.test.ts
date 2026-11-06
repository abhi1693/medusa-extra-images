import { beforeEach, expect, it, vi } from "vitest"
const mock = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }))
vi.mock("../../src/catalog-images/service", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  readArtwork: mock.read,
  saveArtwork: mock.save,
}))
import {
  listMemberMedia,
  saveSelectedArtwork,
} from "../../src/catalog-images/media"
const list = vi.fn(),
  many = vi.fn()
const scope: any = {
  resolve: () => ({ listProducts: list, listAndCountProducts: many }),
}
beforeEach(() => {
  vi.clearAllMocks()
  mock.read.mockResolvedValue({ url: null, revision: "0" })
  mock.save.mockImplementation(async (_scope, _kind, _id, input) => input)
  list.mockResolvedValue([
    { id: "prod_a", images: [{ url: "https://example.com/a.png" }] },
  ])
  many.mockResolvedValue([[{ id: "prod_a", title: "Member", images: [] }], 1])
})
it.each(["collection", "category"] as const)(
  "scopes search and pagination on the server for %s",
  async (kind) => {
    expect(await listMemberMedia(scope, kind, "owner", "search", 12)).toEqual({
      products: [
        { id: "prod_a", title: "Member", images: [], thumbnail: undefined },
      ],
      count: 1,
    })
    expect(many).toHaveBeenCalledWith(
      expect.objectContaining(
        kind === "collection"
          ? { collection_id: "owner", q: "search" }
          : { categories: { id: "owner" }, q: "search" }
      ),
      expect.objectContaining({ take: 12, skip: 12 })
    )
  }
)
it("rejects URL injection and products moved outside the group", async () => {
  const command = { url: "https://example.com/a.png", revision: "0" }
  await expect(
    saveSelectedArtwork(scope, "collection", "owner", command)
  ).rejects.toThrow("Select")
  list.mockResolvedValueOnce([])
  await expect(
    saveSelectedArtwork(scope, "collection", "owner", {
      ...command,
      product_id: "unrelated",
    })
  ).rejects.toThrow("no longer")
  expect(mock.save).not.toHaveBeenCalled()
})
it("accepts scoped gallery images and native thumbnails", async () => {
  const command = {
    url: "https://example.com/a.png",
    revision: "0",
    product_id: "prod_a",
  }
  await saveSelectedArtwork(scope, "collection", "owner", command)
  expect(list).toHaveBeenCalledWith(
    { collection_id: "owner", id: "prod_a" },
    expect.objectContaining({ relations: ["images"] })
  )
  list.mockResolvedValueOnce([{ thumbnail: command.url }])
  await saveSelectedArtwork(scope, "category", "owner", command)
  expect(list).toHaveBeenLastCalledWith(
    { categories: { id: "owner" }, id: "prod_a" },
    expect.anything()
  )
  list.mockResolvedValueOnce([{ thumbnail: "other" }])
  await expect(
    saveSelectedArtwork(scope, "category", "owner", command)
  ).rejects.toThrow("no longer")
})
it("keeps existing artwork after membership changes and permits clearing", async () => {
  mock.read.mockResolvedValue({
    url: "https://example.com/a.png",
    revision: "saved",
  })
  await saveSelectedArtwork(scope, "category", "owner", {
    url: "https://example.com/a.png",
    revision: "saved",
  })
  await saveSelectedArtwork(scope, "category", "owner", {
    url: null,
    revision: "saved",
  })
  expect(list).not.toHaveBeenCalled()
})
