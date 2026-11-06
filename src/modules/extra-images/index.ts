import { Module } from "@medusajs/framework/utils"
import service from "./service"
export const EXTRA_IMAGES_MODULE = "extra_images"
export default Module(EXTRA_IMAGES_MODULE, { service })
