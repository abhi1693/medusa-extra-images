import { Module } from "@medusajs/framework/utils"
import service from "./service"
// Historical DI key retained so existing collection rows/migrations remain owned.
export const PRODUCT_COLLECTION_IMAGE_MODULE = "product_collection_image"
export default Module(PRODUCT_COLLECTION_IMAGE_MODULE, { service })
