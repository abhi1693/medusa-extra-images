import { expect, it, vi } from "vitest"
vi.mock("@medusajs/framework/utils", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  MedusaService: () => class {},
  Module: (key: string, options: unknown) => ({ key, ...(options as object) }),
}))
import definition, {
  PRODUCT_COLLECTION_IMAGE_MODULE,
} from "../../src/modules/product-collection-image"
import Service from "../../src/modules/product-collection-image/service"
import Model from "../../src/modules/product-collection-image/models/product-collection-image"
import * as entry from "../../src"
import middlewares from "../../src/api/middlewares"
it("owns the compatible collection model and exposes stable public APIs", () => {
  expect(PRODUCT_COLLECTION_IMAGE_MODULE).toBe("product_collection_image")
  expect(definition).toMatchObject({
    key: PRODUCT_COLLECTION_IMAGE_MODULE,
    service: Service,
  })
  expect(Model).toBeTruthy()
  expect(entry.readArtwork).toBeTypeOf("function")
  expect(middlewares).toBeTruthy()
  const fresh = new Service({})
  expect(fresh.imageKey).toBe("extra_images_category_image")
  expect(fresh.revisionKey).toBe("extra_images_category_revision")
  for (const enableCategories of [false, true])
    for (const enableCollections of [false, true]) {
      const service = new Service({}, { enableCategories, enableCollections })
      expect(service.categoriesEnabled).toBe(enableCategories)
      expect(service.collectionsEnabled).toBe(enableCollections)
    }
  const legacy = new Service(
    {},
    {
      categoryImageKey: "legacy_image",
      categoryRevisionKey: "legacy_revision",
    }
  )
  expect(legacy.imageKey).toBe("legacy_image")
  expect(legacy.revisionKey).toBe("legacy_revision")
})
