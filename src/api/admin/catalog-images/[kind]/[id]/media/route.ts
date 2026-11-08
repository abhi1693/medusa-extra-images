import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { imageKind } from "../../../../../../catalog-images/service"
import { listMemberMedia } from "../../../../../../catalog-images/media"
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  res.setHeader("Cache-Control", "private, no-store")
  const query = req.validatedQuery as { q: string; offset: number }
  res.json(
    await listMemberMedia(
      req.scope,
      imageKind(req.params.kind),
      req.params.id,
      query.q,
      query.offset
    )
  )
}
