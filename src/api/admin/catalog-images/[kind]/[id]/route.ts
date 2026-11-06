import { saveSelectedArtwork } from "../../../../../catalog-images/media"
import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { imageKind, readArtwork } from "../../../../../catalog-images/service"
import type { ImageCommand } from "../../../../../catalog-images/service"
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  res.setHeader("Cache-Control", "private, no-store")
  res.json({
    image: await readArtwork(
      req.scope,
      imageKind(req.params.kind),
      req.params.id
    ),
  })
}
export async function POST(
  req: AuthenticatedMedusaRequest<ImageCommand>,
  res: MedusaResponse
) {
  res.setHeader("Cache-Control", "private, no-store")
  res.json({
    image: await saveSelectedArtwork(
      req.scope,
      imageKind(req.params.kind),
      req.params.id,
      req.validatedBody
    ),
  })
}
