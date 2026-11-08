import type {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import type { IUserModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { imageFeatures } from "../../../../catalog-images/features"
export async function GET(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  await req.scope
    .resolve<IUserModuleService>(Modules.USER)
    .retrieveUser(req.auth_context.actor_id, { select: ["id"] })
  res.setHeader("Cache-Control", "private, no-store")
  res.json(imageFeatures(req.scope))
}
