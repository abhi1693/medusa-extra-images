import { beforeEach, expect, it, vi } from "vitest"
import {
  imageKind,
  imageUrl,
  readArtwork,
  saveArtwork,
} from "../../src/catalog-images/service"
import {
  artworkCommand,
  memberMediaQuery,
} from "../../src/catalog-images/input"
import { CATALOG_IMAGE_RESOURCES } from "../../src/config/catalog-images-access"
let rows: any[], images: any, product: any, scope: any
beforeEach(() => {
  rows = []
  images = {
    listExtraImages: vi.fn(async ({ owner_kind, owner_id }) =>
      rows.filter(
        (row) => row.owner_kind === owner_kind && row.owner_id === owner_id
      )
    ),
    createExtraImages: vi.fn(async (data) => {
      const row = { id: "ximg_" + rows.length, ...data }
      rows.push(row)
      return row
    }),
    updateExtraImages: vi.fn(async (data) => {
      Object.assign(
        rows.find((row) => row.id === data.id),
        data
      )
      return data
    }),
  }
  product = {
    retrieveProductCollection: vi.fn(async () => ({ id: "pcol_a" })),
    retrieveProductCategory: vi.fn(async () => ({
      id: "pcat_a",
      is_active: true,
      is_internal: false,
      metadata: { merchant_note: "unchanged" },
    })),
  }
  scope = {
    resolve: (name: string) =>
      name === "product"
        ? product
        : name === "locking"
          ? { execute: async (_key: string, fn: () => any) => fn() }
          : images,
  }
})
it("validates kinds, declared payloads and safe original URLs", () => {
  expect(imageKind("collection")).toBe("collection")
  expect(imageKind("category")).toBe("category")
  expect(() => imageKind("product")).toThrow("Unknown")
  for (const value of [
    undefined,
    "",
    12,
    "invalid",
    "javascript:alert(1)",
    "https://user:pass@example.com/a",
  ])
    expect(imageUrl(value)).toBeNull()
  expect(imageUrl("http://example.com/a.png")).toBe("http://example.com/a.png")
  expect(imageUrl("https://example.com/a%20b.png")).toBe(
    "https://example.com/a%20b.png"
  )
  expect(artworkCommand.safeParse({ url: null, revision: "0" }).success).toBe(
    true
  )
  expect(
    artworkCommand.safeParse({ url: null, revision: "0", id: "other" }).success
  ).toBe(false)
  expect(memberMediaQuery.parse({})).toEqual({ q: "", offset: 0 })
  expect(memberMediaQuery.safeParse({ offset: -1 }).success).toBe(false)
  expect(CATALOG_IMAGE_RESOURCES).toHaveLength(1)
})
it.each(["collection", "category"] as const)(
  "persists, replaces and clears %s media without mutating native media or metadata",
  async (kind) => {
    expect(await readArtwork(scope, kind, "owner")).toEqual({
      url: null,
      revision: "0",
    })
    const first = await saveArtwork(scope, kind, "owner", {
      url: "https://example.com/original.png",
      revision: "0",
    })
    expect(await readArtwork(scope, kind, "owner")).toEqual(first)
    const second = await saveArtwork(scope, kind, "owner", {
      url: "https://example.com/replaced.png",
      revision: first.revision,
    })
    const clear = await saveArtwork(scope, kind, "owner", {
      url: null,
      revision: second.revision,
    })
    expect(await readArtwork(scope, kind, "owner")).toEqual(clear)
    expect(clear.url).toBeNull()
    expect(rows).toHaveLength(1)
    expect(images.createExtraImages).toHaveBeenCalledTimes(1)
  }
)
it("never selects another owner's record, even across entity kinds", async () => {
  rows = [
    {
      id: "foreign",
      owner_kind: "category",
      owner_id: "owner",
      url: "https://example.com/foreign.png",
      revision: "saved",
    },
  ]
  await saveArtwork(scope, "collection", "owner", {
    url: "https://example.com/new.png",
    revision: "0",
  })
  expect(rows[0].url).toBe("https://example.com/foreign.png")
  expect(images.updateExtraImages).not.toHaveBeenCalled()
})
it("refuses missing owners, stale writes, unsafe URLs and preserves records after storage failures", async () => {
  await expect(
    saveArtwork(scope, "collection", "owner", {
      url: "data:image/png,a",
      revision: "0",
    })
  ).rejects.toThrow("HTTP")
  await expect(
    saveArtwork(scope, "collection", "owner", { url: null, revision: "stale" })
  ).rejects.toThrow("Reopen")
  product.retrieveProductCollection.mockRejectedValueOnce(
    new Error("Owner not found")
  )
  await expect(readArtwork(scope, "collection", "missing")).rejects.toThrow(
    "Owner not found"
  )
  images.createExtraImages.mockRejectedValueOnce(
    new Error("Storage unavailable")
  )
  await expect(
    saveArtwork(scope, "collection", "owner", { url: null, revision: "0" })
  ).rejects.toThrow("Storage unavailable")
  expect(rows).toHaveLength(0)
})
it("does not expose inactive/internal categories and ignores native metadata as an image source", async () => {
  product.retrieveProductCategory.mockResolvedValueOnce({
    is_active: false,
    is_internal: false,
  })
  await expect(readArtwork(scope, "category", "owner", true)).rejects.toThrow(
    "not found"
  )
  product.retrieveProductCategory.mockResolvedValueOnce({
    is_active: true,
    is_internal: true,
  })
  await expect(readArtwork(scope, "category", "owner", true)).rejects.toThrow(
    "not found"
  )
  expect(await readArtwork(scope, "category", "owner", true)).toEqual({
    url: null,
    revision: "0",
  })
  rows = [
    {
      id: "bad",
      owner_kind: "category",
      owner_id: "owner",
      url: "invalid",
      revision: "saved",
    },
  ]
  expect((await readArtwork(scope, "category", "owner")).url).toBeNull()
})
