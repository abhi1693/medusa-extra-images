import type {
  MedusaContainer,
  IProductModuleService,
  ILockingModule,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { randomUUID } from "node:crypto"
export type ImageKind = "collection" | "category"
export type Artwork = { url: string | null; revision: string }
type ImageRow = {
  id: string
  url: string
  metadata?: Record<string, unknown> | null
}
interface ImageService {
  listProductCollectionImages(
    filter: { product_collection_id: string },
    config: { order: { rank: "ASC"; id: "ASC" } }
  ): Promise<ImageRow[]>
  createProductCollectionImages(data: {
    product_collection_id: string
    url: string
    rank: number
    metadata: Record<string, unknown>
  }): Promise<ImageRow>
  updateProductCollectionImages(data: {
    id: string
    url: string
    metadata: Record<string, unknown>
  }): Promise<ImageRow>
}
export const imageModule = "product_collection_image"
export function imageKind(value: string): ImageKind {
  if (value !== "collection" && value !== "category")
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Unknown artwork type"
    )
  return value
}
export function imageUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null
  try {
    const url = new URL(value)
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? value
      : null
  } catch {
    return null
  }
}
async function owner(
  scope: MedusaContainer,
  kind: ImageKind,
  id: string,
  publicOnly: boolean
) {
  const product = scope.resolve<IProductModuleService>(Modules.PRODUCT)
  if (kind === "collection")
    return { product, record: await product.retrieveProductCollection(id) }
  const record = await product.retrieveProductCategory(id)
  if (publicOnly && (!record.is_active || record.is_internal))
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Category not found")
  return { product, record }
}
export async function readArtwork(
  scope: MedusaContainer,
  kind: ImageKind,
  id: string,
  publicOnly = false
): Promise<Artwork> {
  const { record } = await owner(scope, kind, id, publicOnly)
  if (kind === "category") {
    const { imageKey, revisionKey } = scope.resolve<{
      imageKey: string
      revisionKey: string
    }>(imageModule)
    return {
      url: imageUrl(record.metadata?.[imageKey]),
      revision:
        typeof record.metadata?.[revisionKey] === "string"
          ? (record.metadata![revisionKey] as string)
          : "0",
    }
  }
  const rows = await scope
    .resolve<ImageService>(imageModule)
    .listProductCollectionImages(
      { product_collection_id: id },
      { order: { rank: "ASC", id: "ASC" } }
    )
  const row = rows[0]
  return {
    url: imageUrl(row?.url),
    revision:
      typeof row?.metadata?.revision === "string"
        ? row.metadata.revision
        : row?.id || "0",
  }
}
export type ImageCommand = {
  url: string | null
  revision: string
  product_id?: string
}
export async function saveArtwork(
  scope: MedusaContainer,
  kind: ImageKind,
  id: string,
  command: ImageCommand
): Promise<Artwork> {
  if (command.url !== null && !imageUrl(command.url))
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Use an absolute HTTP(S) image URL without credentials"
    )
  return scope
    .resolve<ILockingModule>(Modules.LOCKING)
    .execute(`catalog-artwork:${kind}:${id}`, async () => {
      const current = await readArtwork(scope, kind, id)
      if (current.revision !== command.revision)
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          "Artwork changed. Reopen the media selector before saving."
        )
      const revision = randomUUID(),
        { product, record } = await owner(scope, kind, id, false)
      if (kind === "category") {
        const { imageKey, revisionKey } = scope.resolve<{
          imageKey: string
          revisionKey: string
        }>(imageModule)
        await product.updateProductCategories(id, {
          metadata: {
            ...record.metadata,
            [imageKey]: command.url,
            [revisionKey]: revision,
          },
        })
      } else {
        const service = scope.resolve<ImageService>(imageModule)
        const rows = await service.listProductCollectionImages(
          { product_collection_id: id },
          { order: { rank: "ASC", id: "ASC" } }
        )
        const data = {
          url: command.url || "",
          metadata: { ...rows[0]?.metadata, revision },
        }
        if (rows[0])
          await service.updateProductCollectionImages({
            id: rows[0].id,
            ...data,
          })
        else
          await service.createProductCollectionImages({
            product_collection_id: id,
            rank: 0,
            ...data,
          })
      }
      return { url: command.url, revision }
    })
}
