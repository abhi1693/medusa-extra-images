# Medusa Extra Images

Collection and category images chosen from their native member-product media.
Medusa **2.22.2**, UI **4.2.9**, React **18.3.1** and Router **7** consuming Admin.

## Behavior

The public Admin widgets reproduce the native product Media panel's divided
container/header, action menu, compact rounded image tiles, selection checkbox,
Remove command bar, empty state and FocusModal. They do not import private
Dashboard components. One selected image is associated with each collection
or category. Its original URL is reused; no file is uploaded or duplicated.

The selector searches/paginates only products in the current collection or
direct category membership. It does not include descendants or a related-products
plugin. The backend rechecks product membership and image ownership at save time.
An existing selection survives later product membership changes, and can be
replaced or cleared. Source product media and thumbnails are never mutated.

There are no uploads, pasted-URL or alt-text fields, thumbnail designation/badges,
manual reload controls, or runtime image fallbacks. Clearing a selection returns
`{ image: { url: null } }`. A consuming storefront must render no image for null
or failed image loads.

## Installation

Install the repository at an exact reviewed commit (this project is not published
to npm). Approve only this package's reviewed prepare build when using npm's
`allowScripts`. Register the full plugin, not just its module:

```ts
plugins: [
  {
    resolve: "@abhi1693/medusa-extra-images",
    options: {
      // Optional compatibility keys for an existing application's category metadata.
      enableCategories: true,
      enableCollections: true,
      categoryImageKey: "merchant_category_image",
      categoryRevisionKey: "merchant_category_revision",
    },
  },
]
```

New applications can omit the options; defaults are
`extra_images_category_image` and `extra_images_category_revision`.
Category writes use the owning native Product module and preserve unrelated
metadata. Optional `@abhi1693/medusa-rbac` integration: spread
`CATALOG_IMAGE_RESOURCES` from `@abhi1693/medusa-extra-images/rbac` into
the configured resources. Reads/writes use categories.view/manage or
collections.view/manage; media browsing also requires products.view.
Without that adapter, authenticated existing native staff have the same
authorization boundary as native Medusa Admin operations. Store routes use the
native publishable-key middleware and exclude inactive/internal categories.

The Admin SDK uses the consuming Admin's backend URL, session/JWT mode and token
storage key. No additional Router version is installed.

## Storage compatibility and safe rollout

The owned collection module deliberately retains the historical DI key
`product_collection_image`, table/column schema and migration identifier
`Migration20250704070026`. This supports replacing an earlier compatible module
without rewriting existing rows or deleting its non-selected rows. The module
is owned implementation, with no dependency on Alphabite.

Only one module may own that historical key. Remove the previous plugin/module
registration before registering this plugin. Back up the database, inspect its
schema/migration record, and rehearse against a restored disposable copy before
changing an existing runtime. No automatic import/population/seed runs at startup.
The initial migration uses CREATE IF NOT EXISTS. Its down operation refuses to
drop media data; roll back application code using the compatible retained schema,
or restore a reviewed backup.

Category compatibility is explicit through the options above; there is no
runtime legacy fallback. Existing clears carry revision tombstones, so an
application's one-time population must skip them. The plugin's public trusted
server APIs `readArtwork`/`saveArtwork` are available at `/service` for
application-owned migration tooling. HTTP selection always validates membership.

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
