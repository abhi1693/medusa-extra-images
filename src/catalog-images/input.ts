import { z } from "@medusajs/framework/zod"
export const artworkCommand = z
  .object({
    url: z.string().max(4096).nullable(),
    product_id: z.string().min(1).max(100).optional(),
    revision: z.string().min(1).max(100),
  })
  .strict()
export const memberMediaQuery = z
  .object({
    q: z.string().max(200).default(""),
    offset: z.coerce.number().int().min(0).max(100000).default(0),
  })
  .strict()
