import { beforeEach, expect, it, vi } from "vitest"
const mock = vi.hoisted(() => ({ read: vi.fn(), save: vi.fn() }))
vi.mock("../../src/catalog-images/service", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  readArtwork: mock.read,
  saveArtwork: mock.save,
}))
import {
  listMemberMedia,
  memberFilter,
  saveSelectedArtwork,
} from "../../src/catalog-images/media"
const list = vi.fn(),
  many = vi.fn(),
  categories = vi.fn()
const scope: any = {
  resolve: () => ({
    listProducts: list,
    listAndCountProducts: many,
    listProductCategories: categories,
  }),
}
beforeEach(() => {
  vi.clearAllMocks()
  categories.mockResolvedValue([{ id: "owner", category_children: [] }])
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
          : { categories: { id: ["owner"] }, q: "search" }
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
    { categories: { id: ["owner"] }, id: "prod_a" },
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

it("includes direct, child and deeply nested membership in one paginated query", async () => {
  const leaf = { id: "leaf" }
  categories.mockResolvedValue([
    {
      id: "owner",
      category_children: [
        { id: "child", category_children: [leaf, leaf] },
        { id: "sibling", category_children: [] },
      ],
    },
  ])
  await listMemberMedia(scope, "category", "owner", "needle", 24)
  expect(categories).toHaveBeenCalledWith(
    { id: "owner", include_descendants_tree: true },
    { take: 1, relations: ["category_children"] }
  )
  const filter = many.mock.calls[0][0]
  expect(new Set(filter.categories.id)).toEqual(
    new Set(["owner", "child", "sibling", "leaf"])
  )
  expect(filter.categories.id).toHaveLength(4)
  expect(filter.q).toBe("needle")
  expect(many).toHaveBeenCalledTimes(1)
  expect(many.mock.calls[0][1]).toMatchObject({
    take: 12,
    skip: 24,
    order: { title: "ASC", id: "ASC" },
  })
})

it("validates descendant media on save and rejects a product moved outside the subtree", async () => {
  categories.mockResolvedValue([
    {
      id: "owner",
      category_children: [
        { id: "child", category_children: [{ id: "grandchild" }] },
      ],
    },
  ])
  const command = {
    url: "https://example.com/a.png",
    revision: "0",
    product_id: "prod_a",
  }
  await saveSelectedArtwork(scope, "category", "owner", command)
  expect(list.mock.calls[0][0]).toEqual({
    categories: { id: ["owner", "child", "grandchild"] },
    id: "prod_a",
  })
  list.mockResolvedValueOnce([])
  await expect(
    saveSelectedArtwork(scope, "category", "owner", command)
  ).rejects.toThrow("no longer")
  expect(mock.save).toHaveBeenCalledTimes(1)
})

it("keeps root-only filtering if the tree changes between owner check and lookup", async () => {
  categories.mockResolvedValue([])
  await listMemberMedia(scope, "category", "owner", "", 0)
  expect(many.mock.calls[0][0].categories.id).toEqual(["owner"])
})

it("preserves direct member filter compatibility", () => {
  expect(memberFilter("category", "owner")).toEqual({
    categories: { id: "owner" },
  })
})
