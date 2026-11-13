import { Button, Input, Label, Text } from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useState } from "react"
import { sdk } from "../lib/client"
type MediaProduct = {
  id: string
  title: string
  thumbnail?: string | null
  images?: { id: string; url: string }[]
}
export default function ExistingMediaPicker({
  kind,
  id,
  busy,
  onSelect,
  onClose,
}: {
  kind: "collection" | "category"
  id: string
  busy: boolean
  onSelect: (url: string, productId: string) => void
  onClose: () => void
}) {
  const [search, setSearch] = useState(""),
    [offset, setOffset] = useState(0)
  const products = useQuery({
    queryKey: ["catalog-artwork-media", kind, id, search, offset],
    queryFn: () =>
      sdk.client.fetch<{ products: MediaProduct[]; count: number }>(
        `/admin/catalog-images/${kind}/${id}/media`,
        { query: { q: search, offset } }
      ),
    retry: false,
  })
  return (
    <div
      role="group"
      aria-label="Existing product media"
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor={kind + "-artwork-media-search"}>
          Find product media
        </Label>
        <Input
          id={kind + "-artwork-media-search"}
          type="search"
          value={search}
          disabled={busy}
          onChange={(event) => {
            setSearch(event.target.value)
            setOffset(0)
          }}
        />
        <Text size="small" className="text-ui-fg-subtle">
          Images from products in this {kind}
          {kind === "category" ? " and its subcategories" : ""}.
        </Text>
      </div>
      {products.isPending ? (
        <Text>Loading media…</Text>
      ) : products.isError ? (
        <Text role="alert">
          Could not load product media. Product view permission is required.
        </Text>
      ) : (
        <>
          {products.data.products.length ? (
            products.data.products.map((product) => {
              const images = [...(product.images || [])]
              if (
                product.thumbnail &&
                !images.some((image) => image.url === product.thumbnail)
              )
                images.unshift({
                  id: product.id + "-thumbnail",
                  url: product.thumbnail,
                })
              return (
                <div key={product.id} className="flex flex-col gap-3">
                  <Text weight="plus">{product.title}</Text>
                  {images.length ? (
                    <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4">
                      {images.map((image, index) => (
                        <button
                          key={image.id}
                          type="button"
                          disabled={busy}
                          aria-label={`Select ${product.title} image ${index + 1}`}
                          onClick={() => onSelect(image.url, product.id)}
                          className="relative aspect-square overflow-hidden rounded-[8px] shadow-elevation-card-rest hover:shadow-elevation-card-hover focus-visible:ring-2 focus-visible:ring-ui-border-interactive"
                        >
                          <img
                            src={image.url}
                            alt=""
                            className="size-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <Text size="small" className="text-ui-fg-muted">
                      No media on this product.
                    </Text>
                  )}
                </div>
              )
            })
          ) : (
            <Text>No products match this search.</Text>
          )}
          <div className="flex gap-2">
            <Button
              size="small"
              variant="secondary"
              disabled={busy || !offset}
              onClick={() => setOffset(Math.max(0, offset - 12))}
            >
              Previous media
            </Button>
            <Button
              size="small"
              variant="secondary"
              disabled={busy || offset + 12 >= products.data.count}
              onClick={() => setOffset(offset + 12)}
            >
              Next media
            </Button>
          </div>
        </>
      )}
      <Button
        size="small"
        variant="secondary"
        disabled={busy}
        onClick={onClose}
      >
        Cancel
      </Button>
    </div>
  )
}
