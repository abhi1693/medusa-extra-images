import { expect, it, vi } from "vitest"
vi.mock("@medusajs/framework/utils", async (importOriginal) => ({
  ...(await importOriginal<any>()),
  MedusaService: () => class {},
  Module: (key: string, options: unknown) => ({ key, ...(options as object) }),
}))
import definition, { EXTRA_IMAGES_MODULE } from "../../src/modules/extra-images"
import Service from "../../src/modules/extra-images/service"
import Model from "../../src/modules/extra-images/models/extra-image"
import * as entry from "../../src"
import middlewares from "../../src/api/middlewares"
it("owns generic category/collection records and stable public APIs", () => {
  expect(EXTRA_IMAGES_MODULE).toBe("extra_images")
  expect(definition).toMatchObject({
    key: EXTRA_IMAGES_MODULE,
    service: Service,
  })
  expect(Model).toBeTruthy()
  expect(entry.readArtwork).toBeTypeOf("function")
  expect(middlewares).toBeTruthy()
  const fresh = new Service({})
  expect(fresh.categoriesEnabled).toBe(true)
  expect(fresh.collectionsEnabled).toBe(true)
  for (const enableCategories of [false, true])
    for (const enableCollections of [false, true]) {
      const service = new Service({}, { enableCategories, enableCollections })
      expect(service.categoriesEnabled).toBe(enableCategories)
      expect(service.collectionsEnabled).toBe(enableCollections)
    }
})
