# Medusa Extra Images

[![CI](https://github.com/abhi1693/medusa-extra-images/actions/workflows/checks.yml/badge.svg?branch=master)](https://github.com/abhi1693/medusa-extra-images/actions/workflows/checks.yml)
[![Medusa 2.22.2](https://img.shields.io/badge/Medusa-2.22.2-7c3aed)](https://docs.medusajs.com/)
[![MIT license](https://img.shields.io/github/license/abhi1693/medusa-extra-images)](LICENSE)
[![Sponsor](https://img.shields.io/badge/Sponsor-abhi1693-ea4aaa?logo=githubsponsors&logoColor=white)](https://github.com/sponsors/abhi1693)

Collection and category images chosen from their native member-product media.
Medusa **2.22.2**, UI **4.2.9**, React **18.3.1** and Router **7** consuming Admin.

## Behavior

The public Admin widgets reproduce the native product Media panel's divided
container/header, action menu, compact rounded image tiles, selection checkbox,
Remove command bar, empty state and FocusModal. They do not import private
Dashboard components. One selected image is associated with each collection
or category. Its original URL is reused; no file is uploaded or duplicated.

The selector searches/paginates only products in the current collection or
category and all nested subcategories. Products linked to multiple categories
appear once with native server-side search and pagination. It does not include
a related-products plugin. The backend rechecks product membership and image ownership at save time.
An existing selection survives later product membership changes, and can be
replaced or cleared. Source product media and thumbnails are never mutated.

There are no uploads, pasted-URL or alt-text fields, thumbnail designation/badges,
manual reload controls, or runtime image fallbacks. Clearing a selection returns
`{ image: { url: null } }`. A consuming storefront must render no image for null
or failed image loads.

## Installation

The first npm release is `@abhi1693/medusa-extra-images@0.0.1`. Once available,
install it with:

```sh
npm install @abhi1693/medusa-extra-images@0.0.1
```

To install a source revision, pin a reviewed commit:

```sh
npm install 'git+https://github.com/abhi1693/medusa-extra-images.git#<commit>'
```

Git dependencies run `prepare` to build the plugin. Approve only this package's
reviewed prepare build when using npm's `allowScripts`. Register the full plugin,
not just its module:

```ts
plugins: [
  {
    resolve: "@abhi1693/medusa-extra-images",
    options: {
      enableCategories: true,
      enableCollections: true,
    },
  },
]
```

The plugin owns category and collection image records in its extra_image table. It does not read or write native category metadata. Optional `@abhi1693/medusa-rbac` integration: spread
`CATALOG_IMAGE_RESOURCES` from `@abhi1693/medusa-extra-images/rbac` into
the configured resources. Reads/writes use categories.view/manage or
collections.view/manage; media browsing also requires products.view.
Without that adapter, authenticated existing native staff have the same
authorization boundary as native Medusa Admin operations. Store routes use the
native publishable-key middleware and exclude inactive/internal categories.

The Admin SDK uses the consuming Admin's backend URL, session/JWT mode and token
storage key. No additional Router version is installed.

## Owned storage and rollout

The extra_images module owns one extra_image record per category or collection
through a unique (owner_kind, owner_id) key. Native Product module services
validate entity existence; the plugin never writes native catalog tables.
Clear selections retain a revision tombstone. There are no application-specific
metadata keys, old-plugin schemas, migration imports or runtime compatibility
fallbacks in this plugin. A consuming application's explicit one-time import may
use the public trusted saveArtwork server API; migration policies/data belong in
that application, outside this repository.

Back up and rehearse native migrations before rollout. The migration creates only
this module's own table and index. Its down operation refuses to delete image data.

Category widgets use the supported product_category.details.side zone after
Organize. Medusa 2.22.2 exposes no collection sidebar widget zone; the collection
widget uses the supported product_collection.details main-column zone. No
Dashboard/core patch or unsupported injection zone is used.

Writes use the configured public Medusa Locking module and optimistic revisions.
Use a shared durable provider for multiple backend processes. Invalid/stale writes
fail instead of overwriting another user's selection. Shared File/Product media
is never deleted.

## Public API

- GET/POST `/admin/catalog-images/:kind/:id`, kind = category or collection.
- GET `/admin/catalog-images/:kind/:id/media?q=&offset=0`, fixed 12-product page.
- GET `/store/catalog-images/:kind/:id`, only selected URL, no-store.

POST accepts `{ url: string | null, revision: string, product_id?: string }`.
New selections require the owning member product ID and one of its current image
URLs; callers cannot supply storage image-row IDs. The UI supplies this payload,
not a user URL field. All bodies/queries reject undeclared keys.

## Development and verification

All commands run through root Docker Compose:

```sh
docker compose build tools
docker compose run --rm tools npm run typecheck
docker compose run --rm tools npm test
docker compose run --rm tools sh -c 'npm run build && npm run test:package'
docker compose run --rm format
```

Unit/component coverage requires 100% per source file (generated migrations
excluded). Consuming-application integration tests must additionally cover
native migrations, authorization, storage persistence, replacement/removal,
member changes, clear-preserving population and Store no-store empty responses.

Design references: [widgets](https://docs.medusajs.com/learn/fundamentals/admin/widgets),
[constraints](https://docs.medusajs.com/learn/fundamentals/admin/constraints),
[modules](https://docs.medusajs.com/learn/fundamentals/modules),
[Locking](https://docs.medusajs.com/resources/architectural-modules/locking),
[FocusModal](https://docs.medusajs.com/ui/components/focus-modal).
The native Dashboard product Media source was inspected for layout/action
parity. The custom selector is a widget modal rather than a native product route.

No credentials, merchant catalog exports, backups or runtime uploads belong in
this public repository.

### Independent feature options

Both features default to enabled. Set enableCategories and enableCollections independently: true/true enables both, true/false categories only, false/true collections only, false/false neither. Disabled API reads/writes return 404 and their Admin widgets render nothing. Toggling options never deletes or rewrites saved images; re-enabling reveals the saved selection. Restart the backend and refresh Admin after configuration changes. GET /admin/catalog-images/config exposes only these flags to authenticated staff.

## License

[MIT](LICENSE)

### Nested category media validation (2026-11-13)

The picker and save-time ownership check resolve the selected category with
the public Product Module `listProductCategories` API using
`include_descendants_tree: true`. The resulting IDs (including the root) are
deduplicated and passed to one native `listAndCountProducts` / `listProducts`
query, so search, distinct products, counts and pagination remain server-side.
Collection behavior and staff/RBAC guards are unchanged.

References:

- https://docs.medusajs.com/resources/references/product/listProductCategories
- https://docs.medusajs.com/resources/references/product/listAndCountProducts

Inspected the installed 2.22.2 ProductCategoryService/repository and public types;
verified the same query read-only in a consuming Medusa 2.22.4 demo.
Regression tests cover direct members, deep descendants, duplicate category
references, unchanged collection filtering, saved media ownership and a product
moved outside the subtree. The plugin tests, typecheck, build and package-export
checks run through Docker Compose.
