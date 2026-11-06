import { beforeEach, describe, expect, it, vi } from "vitest"
import type { MedusaContainer } from "@medusajs/framework/types"
import {
  imageKind,
  imageUrl,
  readArtwork,
  saveArtwork,
} from "../../src/catalog-images/service"
import { artworkCommand } from "../../src/catalog-images/input"
import { CATALOG_IMAGE_RESOURCES } from "../../src/config/catalog-images-access"
let rows: any[]
let category: any
let collection: any
let images: any
let product: any
let scope: MedusaContainer
beforeEach(() => {
  rows = []
  category = {
    id: "pcat_a",
    is_active: true,
    is_internal: false,
    metadata: { unrelated: "keep" },
  }
  collection = { id: "pcol_a" }
  images = {
    imageKey: "legacy_image",
    revisionKey: "legacy_revision",
    listProductCollectionImages: vi.fn(async ({ product_collection_id }) =>
      rows.filter((r) => r.product_collection_id === product_collection_id)
    ),
    createProductCollectionImages: vi.fn(async (data) => {
      const row = { ...data, id: "colli_a" }
      rows.push(row)
      return row
    }),
    updateProductCollectionImages: vi.fn(async (data) => {
      Object.assign(
        rows.find((r) => r.id === data.id),
        data
      )
      return data
    }),
  }
  product = {
    retrieveProductCollection: vi.fn(async () => collection),
    retrieveProductCategory: vi.fn(async () => category),
    updateProductCategories: vi.fn(async (_id, data) =>
      Object.assign(category, data)
    ),
  }
  scope = {
    resolve: (name: string) =>
      name === "product"
        ? product
        : name === "locking"
          ? { execute: async (_key: string, action: () => any) => action() }
          : images,
  } as unknown as MedusaContainer
})
describe("catalog artwork", () => {
  it("validates owner kinds and safe existing URLs without rewriting asset bytes", () => {
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
    expect(imageUrl("https://example.com/a%20b.png")).toBe(
      "https://example.com/a%20b.png"
    )
    expect(imageUrl("http://example.com/a.png")).toBe(
      "http://example.com/a.png"
    )
    expect(artworkCommand.safeParse({ url: null, revision: "0" }).success).toBe(
      true
    )
    expect(
      artworkCommand.safeParse({
        url: null,
        revision: "0",
        id: "other",
      }).success
    ).toBe(false)
    expect(CATALOG_IMAGE_RESOURCES).toHaveLength(1)
  })
  it("creates, persists, replaces and removes one collection association without deleting any media", async () => {
    expect(await readArtwork(scope, "collection", "pcol_a")).toEqual({
      url: null,
      revision: "0",
    })
    const saved = await saveArtwork(scope, "collection", "pcol_a", {
      url: "https://example.com/original.png",
      revision: "0",
    })
    expect(await readArtwork(scope, "collection", "pcol_a")).toEqual(saved)
    const replaced = await saveArtwork(scope, "collection", "pcol_a", {
      url: "https://example.com/replaced.png",
      revision: saved.revision,
    })
    expect(rows).toHaveLength(1)
    expect(images.createProductCollectionImages).toHaveBeenCalledTimes(1)
    const removed = await saveArtwork(scope, "collection", "pcol_a", {
      url: null,
      revision: replaced.revision,
    })
    expect(removed.url).toBeNull()
    expect((await readArtwork(scope, "collection", "pcol_a")).url).toBeNull()
    expect(rows).toHaveLength(1)
  })
  it("never selects another collection's row or accepts a caller-supplied image ID", async () => {
    rows = [
      {
        id: "colli_b",
        product_collection_id: "pcol_b",
        url: "https://example.com/b.png",
      },
    ]
    await saveArtwork(scope, "collection", "pcol_a", {
      url: "https://example.com/a.png",
      revision: "0",
    })
    expect(rows[0].url).toBe("https://example.com/b.png")
    expect(rows).toHaveLength(2)
    expect(images.updateProductCollectionImages).not.toHaveBeenCalled()
  })
  it("rejects missing owners, stale writes, unsafe URLs and storage failures before losing existing artwork", async () => {
    await expect(
      saveArtwork(scope, "collection", "pcol_a", {
        url: "data:image/png,a",
        revision: "0",
      })
    ).rejects.toThrow("HTTP")
    await expect(
      saveArtwork(scope, "collection", "pcol_a", {
        url: null,
        revision: "stale",
      })
    ).rejects.toThrow("Reopen")
    product.retrieveProductCollection.mockRejectedValueOnce(
      new Error("Owner not found")
    )
    await expect(readArtwork(scope, "collection", "missing")).rejects.toThrow(
      "Owner not found"
    )
    images.createProductCollectionImages.mockRejectedValueOnce(
      new Error("Storage unavailable")
    )
    await expect(
      saveArtwork(scope, "collection", "pcol_a", {
        url: null,
        revision: "0",
      })
    ).rejects.toThrow("Storage unavailable")
    expect(rows).toHaveLength(0)
  })
  it("reads legacy plugin rows with safe defaults and keeps unrelated metadata when replacing", async () => {
    rows = [
      {
        id: "old",
        product_collection_id: "pcol_a",
        url: "invalid",
        metadata: { keep: true, revision: 5 },
      },
    ]
    expect(await readArtwork(scope, "collection", "pcol_a")).toEqual({
      url: null,
      revision: "old",
    })
    await saveArtwork(scope, "collection", "pcol_a", {
      url: null,
      revision: "old",
    })
    expect(rows[0].metadata.keep).toBe(true)
    rows[0].metadata = null
    expect((await readArtwork(scope, "collection", "pcol_a")).revision).toBe(
      "old"
    )
  })
  it("preserves native category artwork and all unrelated metadata", async () => {
    category.metadata = {
      ...category.metadata,
      legacy_image: "https://example.com/existing.png",
    }
    expect(await readArtwork(scope, "category", category.id, true)).toEqual({
      url: "https://example.com/existing.png",
      revision: "0",
    })
    const saved = await saveArtwork(scope, "category", category.id, {
      url: "https://example.com/next.png",
      revision: "0",
    })
    expect(category.metadata.unrelated).toBe("keep")
    expect(await readArtwork(scope, "category", category.id)).toEqual(saved)
    const removed = await saveArtwork(scope, "category", category.id, {
      url: null,
      revision: saved.revision,
    })
    expect(removed.url).toBeNull()
    category.metadata = null
    expect(await readArtwork(scope, "category", category.id)).toEqual({
      url: null,
      revision: "0",
    })
  })
  it("does not expose private or inactive categories on the Store API", async () => {
    category.is_active = false
    await expect(
      readArtwork(scope, "category", category.id, true)
    ).rejects.toThrow("not found")
    category.is_active = true
    category.is_internal = true
    await expect(
      readArtwork(scope, "category", category.id, true)
    ).rejects.toThrow("not found")
    expect((await readArtwork(scope, "category", category.id)).url).toBeNull()
    category.metadata = { legacy_revision: 9 }
    expect((await readArtwork(scope, "category", category.id)).revision).toBe(
      "0"
    )
  })
})
