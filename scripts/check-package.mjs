import assert from "node:assert/strict"
import fs from "node:fs"
import { createRequire } from "node:module"
const require = createRequire(import.meta.url)
for (const path of [
  "index",
  "catalog-images/service",
  "catalog-images/media",
  "config/catalog-images-access",
  "modules/product-collection-image/index",
]) {
  assert.ok(
    fs.existsSync(".medusa/server/src/" + path + ".d.ts"),
    "Missing declaration " + path
  )
  assert.ok(
    require("../.medusa/server/src/" + path + ".js"),
    "Missing CommonJS export " + path
  )
}
for (const file of [
  ".medusa/server/src/admin/index.mjs",
  ".medusa/server/src/admin/index.js",
])
  assert.ok(fs.existsSync(file), "Missing Admin export " + file)
const content = fs.readFileSync(".medusa/server/src/admin/index.mjs", "utf8")
assert.ok(content.includes("product_collection.details"))
assert.ok(content.includes("product_category.details"))
assert.ok(!content.includes("Set as thumbnail"))
assert.ok(!content.includes("Upload image"))
console.log("Server, Admin ESM/CJS and declaration exports verified")
