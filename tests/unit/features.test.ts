import { expect, it, vi } from "vitest"
import {
  imageFeatures,
  assertImageFeature,
} from "../../src/catalog-images/features"
import { GET } from "../../src/api/admin/catalog-images/config/route"
import { readArtwork, saveArtwork } from "../../src/catalog-images/service"
it("supports every independent option combination and rejects disabled data access without mutation", async () => {
  for (const categoriesEnabled of [false, true])
    for (const collectionsEnabled of [false, true]) {
      const native = vi.fn(),
        scope: any = {
          resolve: (key: string) =>
            key === "extra_images"
              ? { categoriesEnabled, collectionsEnabled }
              : {
                  retrieveProductCollection: native,
                  retrieveProductCategory: native,
                },
        }
      expect(imageFeatures(scope)).toEqual({
        categories: categoriesEnabled,
        collections: collectionsEnabled,
      })
      for (const [kind, enabled] of [
        ["category", categoriesEnabled],
        ["collection", collectionsEnabled],
      ] as const) {
        if (enabled) {
          expect(() => assertImageFeature(scope, kind)).not.toThrow()
        } else {
          expect(() => assertImageFeature(scope, kind)).toThrow("disabled")
          await expect(readArtwork(scope, kind, "owner")).rejects.toThrow(
            "disabled"
          )
          await expect(
            saveArtwork(scope, kind, "owner", { url: null, revision: "0" })
          ).rejects.toThrow("disabled")
        }
      }
      expect(native).not.toHaveBeenCalled()
    }
  expect(imageFeatures({ resolve: () => ({}) } as any)).toEqual({
    categories: true,
    collections: true,
  })
})
it("returns only feature flags to existing authenticated staff", async () => {
  const user = vi.fn().mockResolvedValue({ id: "staff" }),
    res: any = { setHeader: vi.fn(), json: vi.fn() },
    req: any = {
      auth_context: { actor_id: "staff" },
      scope: {
        resolve: (key: string) =>
          key === "user"
            ? { retrieveUser: user }
            : { categoriesEnabled: false, collectionsEnabled: true },
      },
    }
  await GET(req, res)
  expect(user).toHaveBeenCalledWith("staff", { select: ["id"] })
  expect(res.json).toHaveBeenCalledWith({
    categories: false,
    collections: true,
  })
  expect(res.setHeader).toHaveBeenCalledWith(
    "Cache-Control",
    "private, no-store"
  )
})

it("re-enabling reveals unchanged owned records", async () => {
  const storage = {
    categoriesEnabled: true,
    collectionsEnabled: true,
    listExtraImages: async () => [
      { id: "owned", url: "https://example.com/chosen.png", revision: "saved" },
    ],
  }
  const scope: any = {
    resolve: (key: string) =>
      key === "extra_images"
        ? storage
        : {
            retrieveProductCategory: async () => ({
              is_active: true,
              is_internal: false,
            }),
            retrieveProductCollection: async () => ({ id: "collection" }),
          },
  }
  for (const kind of ["category", "collection"] as const) {
    const before = await readArtwork(scope, kind, "owner")
    storage.categoriesEnabled = false
    storage.collectionsEnabled = false
    await expect(readArtwork(scope, kind, "owner")).rejects.toThrow("disabled")
    storage.categoriesEnabled = true
    storage.collectionsEnabled = true
    expect(await readArtwork(scope, kind, "owner")).toEqual(before)
  }
})
