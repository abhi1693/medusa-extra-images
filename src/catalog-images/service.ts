import type {
  MedusaContainer,
  IProductModuleService,
  ILockingModule,
} from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import { randomUUID } from "node:crypto"
import { assertImageFeature } from "./features"
export type ImageKind = "collection" | "category"
export type Artwork = { url: string | null; revision: string }
type Row = { id: string; url: string | null; revision: string }
interface ImageService {
  listExtraImages(
    filter: { owner_kind: ImageKind; owner_id: string },
    config: { take: number }
  ): Promise<Row[]>
  createExtraImages(data: {
    owner_kind: ImageKind
    owner_id: string
    url: string | null
    revision: string
  }): Promise<Row>
  updateExtraImages(data: {
    id: string
    url: string | null
    revision: string
  }): Promise<Row>
}
export const imageModule = "extra_images"
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
  if (kind === "collection") {
    await product.retrieveProductCollection(id)
    return
  }
  const category = await product.retrieveProductCategory(id)
  if (publicOnly && (!category.is_active || category.is_internal))
    throw new MedusaError(MedusaError.Types.NOT_FOUND, "Category not found")
}
export async function readArtwork(
  scope: MedusaContainer,
  kind: ImageKind,
  id: string,
  publicOnly = false
): Promise<Artwork> {
  assertImageFeature(scope, kind)
  await owner(scope, kind, id, publicOnly)
  const rows = await scope
    .resolve<ImageService>(imageModule)
    .listExtraImages({ owner_kind: kind, owner_id: id }, { take: 1 })
  return { url: imageUrl(rows[0]?.url), revision: rows[0]?.revision ?? "0" }
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
  assertImageFeature(scope, kind)
  if (command.url !== null && !imageUrl(command.url))
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Use an absolute HTTP(S) image URL without credentials"
    )
  return scope
    .resolve<ILockingModule>(Modules.LOCKING)
    .execute(`extra-images:${kind}:${id}`, async () => {
      const current = await readArtwork(scope, kind, id)
      if (current.revision !== command.revision)
        throw new MedusaError(
          MedusaError.Types.CONFLICT,
          "Artwork changed. Reopen the media selector before saving."
        )
      const service = scope.resolve<ImageService>(imageModule),
        rows = await service.listExtraImages(
          { owner_kind: kind, owner_id: id },
          { take: 1 }
        ),
        revision = randomUUID()
      if (rows[0])
        await service.updateExtraImages({
          id: rows[0].id,
          url: command.url,
          revision,
        })
      else
        await service.createExtraImages({
          owner_kind: kind,
          owner_id: id,
          url: command.url,
          revision,
        })
      return { url: command.url, revision }
    })
}
