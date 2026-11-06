import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { imageKind, readArtwork } from "../../../../../catalog-images/service"
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  res.setHeader("Cache-Control", "no-store")
  const image = await readArtwork(
    req.scope,
    imageKind(req.params.kind),
    req.params.id,
    true
  )
  res.json({ image: { url: image.url } })
}
