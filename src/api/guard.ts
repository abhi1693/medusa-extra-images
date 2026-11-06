import type {
  AuthenticatedMedusaRequest,
  MedusaRequest,
  MedusaResponse,
  MedusaNextFunction,
} from "@medusajs/framework/http"
import type { IUserModuleService } from "@medusajs/framework/types"
import { Modules } from "@medusajs/framework/utils"
import { imageKind } from "../catalog-images/service"
type Principal = { actor_id: string; actor_type: string; active: boolean }
type Access = {
  principalForRequest(req: MedusaRequest): Promise<Principal | null>
  permissionContext(req: MedusaRequest): Promise<Record<string, unknown>>
  allows(
    principal: Principal,
    permission: string,
    context: Record<string, unknown>
  ): boolean
}
export async function guard(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  try {
    const auth = (req as AuthenticatedMedusaRequest).auth_context
    if (auth?.actor_type !== "user" || !auth.actor_id)
      return res.status(401).json({ message: "Staff authentication required" })
    await req.scope
      .resolve<IUserModuleService>(Modules.USER)
      .retrieveUser(auth.actor_id, { select: ["id"] })
    const kind = imageKind(req.params.kind)
    if (!["GET", "POST"].includes(req.method))
      return res.status(403).json({ message: "Unsupported image operation" })
    if (req.scope.hasRegistration("rbac_access")) {
      const access = req.scope.resolve<Access>("rbac_access"),
        principal = await access.principalForRequest(req)
      const root = kind === "collection" ? "collections" : "categories"
      const permissions =
        req.method === "POST"
          ? [root + ".manage"]
          : req.path.endsWith("/media")
            ? [root + ".view", "products.view"]
            : [root + ".view"]
      if (
        !principal ||
        principal.actor_id !== auth.actor_id ||
        principal.actor_type !== "user" ||
        !principal.active
      )
        return res
          .status(403)
          .json({ message: "Catalog image permission required" })
      const context = await access.permissionContext(req)
      if (
        !permissions.every((permission) =>
          access.allows(principal, permission, context)
        )
      )
        return res
          .status(403)
          .json({ message: "Catalog image permission required" })
    }
    return next()
  } catch (error) {
    return next(error)
  }
}
