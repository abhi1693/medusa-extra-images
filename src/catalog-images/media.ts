import type {
  MedusaContainer,
  IProductModuleService,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { readArtwork, saveArtwork } from "./service"
import type { ImageKind, ImageCommand } from "./service"
export function memberFilter(kind: ImageKind, id: string) {
  return kind === "collection" ? { collection_id: id } : { categories: { id } }
}
export async function listMemberMedia(
  scope: MedusaContainer,
  kind: ImageKind,
  id: string,
  q: string,
  offset: number
) {
  await readArtwork(scope, kind, id)
  const [products, count] = await scope
    .resolve<IProductModuleService>(Modules.PRODUCT)
    .listAndCountProducts(
      { ...memberFilter(kind, id), q },
      {
        relations: ["images"],
        take: 12,
        skip: offset,
        order: { title: "ASC", id: "ASC" },
      }
    )
  return {
    products: products.map((product) => ({
      id: product.id,
      title: product.title,
      thumbnail: product.thumbnail,
      images: product.images,
    })),
    count,
  }
}
export async function saveSelectedArtwork(
  scope: MedusaContainer,
  kind: ImageKind,
  id: string,
  command: ImageCommand
) {
  const current = await readArtwork(scope, kind, id)
  if (command.url && command.url !== current.url) {
    if (!command.product_id)
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Select an image from this group's product media"
      )
    const products = await scope
      .resolve<IProductModuleService>(Modules.PRODUCT)
      .listProducts(
        { ...memberFilter(kind, id), id: command.product_id },
        { relations: ["images"], take: 1 }
      )
    if (
      !products.some(
        (product) =>
          product.thumbnail === command.url ||
          product.images?.some((image) => image.url === command.url)
      )
    )
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "That image no longer belongs to a product in this group. Reopen the media selector."
      )
  }
  return saveArtwork(scope, kind, id, command)
}
