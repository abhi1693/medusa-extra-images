import { MedusaService } from "@medusajs/framework/utils"
import ExtraImage from "./models/extra-image"
export type ExtraImageOptions = {
  enableCategories?: boolean
  enableCollections?: boolean
}
export default class ExtraImageService extends MedusaService({ ExtraImage }) {
  readonly categoriesEnabled: boolean
  readonly collectionsEnabled: boolean
  constructor(
    container: Record<string, unknown>,
    options: ExtraImageOptions = {}
  ) {
    super(container)
    this.categoriesEnabled = options.enableCategories ?? true
    this.collectionsEnabled = options.enableCollections ?? true
  }
}
