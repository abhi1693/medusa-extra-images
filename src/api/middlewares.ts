import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"
import { artworkCommand, memberMediaQuery } from "../catalog-images/input"
import { guard } from "./guard"
export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/catalog-images/:kind/:id",
      middlewares: [authenticate("user", ["session", "bearer"]), guard],
    },
    {
      matcher: "/admin/catalog-images/:kind/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(artworkCommand)],
    },
    {
      matcher: "/admin/catalog-images/:kind/:id/media",
      method: "GET",
      middlewares: [
        authenticate("user", ["session", "bearer"]),
        guard,
        validateAndTransformQuery(memberMediaQuery, {}),
      ],
    },
  ],
})
