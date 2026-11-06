import { EllipsisHorizontal, PencilSquare } from "@medusajs/icons"
import {
  Button,
  Checkbox,
  CommandBar,
  Container,
  DropdownMenu,
  FocusModal,
  Heading,
  IconButton,
  Text,
  toast,
} from "@medusajs/ui"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import ExistingMediaPicker from "./existing-media-picker"
import { sdk } from "../lib/client"
type Artwork = { url: string | null; revision: string }
export default function CatalogArtwork({
  kind,
  id,
}: {
  kind: "collection" | "category"
  id: string
}) {
  const cache = useQueryClient(),
    key = ["catalog-artwork", kind, id],
    endpoint = `/admin/catalog-images/${kind}/${id}`
  const query = useQuery({
    queryKey: key,
    queryFn: () => sdk.client.fetch<{ image: Artwork }>(endpoint),
    retry: false,
  })
  const [editing, setEditing] = useState(false),
    [selected, setSelected] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("")
  const current = query.data?.image,
    label = kind === "collection" ? "Collection" : "Category"
  async function save(url: string | null, productId?: string) {
    setBusy(true)
    setError("")
    try {
      const result = await sdk.client.fetch<{ image: Artwork }>(endpoint, {
        method: "POST",
        body: {
          url,
          revision: current!.revision,
          ...(productId ? { product_id: productId } : {}),
        },
      })
      cache.setQueryData(key, result)
      await cache.invalidateQueries({
        queryKey: [kind === "category" ? "product_categories" : "collections"],
      })
      setSelected(false)
      setEditing(false)
      toast.success("Image saved")
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Could not save image. Check your edit permission."
      )
      await cache.invalidateQueries({ queryKey: key })
    } finally {
      setBusy(false)
    }
  }
  return (
    <>
      <Container className="divide-y p-0">
        <div className="flex items-center justify-between px-6 py-4">
          <Heading level="h2">Media</Heading>
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton
                size="small"
                variant="transparent"
                aria-label={label + " media actions"}
              >
                <EllipsisHorizontal />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item
                disabled={busy || !current}
                onClick={() => setEditing(true)}
              >
                <PencilSquare />
                Edit image
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        </div>
        {query.isPending ? (
          <Text className="px-6 py-4">Loading media…</Text>
        ) : query.isError ? (
          <Text role="alert" className="px-6 py-4">
            Could not load media. Check your catalog view permission.
          </Text>
        ) : (
          current &&
          (current.url ? (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-4 px-6 py-4">
              <div className="group relative aspect-square size-full overflow-hidden rounded-[8px] shadow-elevation-card-rest transition-fg hover:shadow-elevation-card-hover">
                <div
                  className={`absolute right-2 top-2 z-10 transition-fg ${selected ? "visible opacity-100" : "invisible opacity-0 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 focus-within:visible focus-within:opacity-100"}`}
                >
                  <Checkbox
                    aria-label={"Select " + kind + " image"}
                    checked={selected}
                    disabled={busy}
                    onCheckedChange={() => setSelected((value) => !value)}
                  />
                </div>
                <button
                  type="button"
                  aria-label={"Change " + kind + " image"}
                  className="size-full focus-visible:ring-2"
                  disabled={busy}
                  onClick={() => setEditing(true)}
                >
                  <img
                    src={current.url}
                    alt={label + " image"}
                    className="size-full object-cover"
                  />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-y-4 pb-8 pt-6">
              <div className="flex flex-col items-center">
                <Text size="small" weight="plus" className="text-ui-fg-subtle">
                  No images
                </Text>
                <Text size="small" className="text-ui-fg-muted">
                  Select an image from products in this {kind}.
                </Text>
              </div>
              <Button
                size="small"
                variant="secondary"
                onClick={() => setEditing(true)}
              >
                Add image
              </Button>
            </div>
          ))
        )}
        {error && (
          <Text role="alert" className="px-6 py-3 text-ui-fg-error">
            {error}
          </Text>
        )}
      </Container>
      <CommandBar open={selected}>
        <CommandBar.Bar>
          <CommandBar.Value>1 selected</CommandBar.Value>
          <CommandBar.Seperator />
          <CommandBar.Command
            label="Remove"
            shortcut="d"
            action={() => save(null)}
          />
        </CommandBar.Bar>
      </CommandBar>
      <FocusModal open={editing} onOpenChange={setEditing}>
        <FocusModal.Content>
          <FocusModal.Header>
            <Heading level="h2">Select {kind} image</Heading>
          </FocusModal.Header>
          <FocusModal.Body className="overflow-y-auto">
            <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
              <ExistingMediaPicker
                kind={kind}
                id={id}
                busy={busy}
                onSelect={save}
                onClose={() => setEditing(false)}
              />
              {error && (
                <Text role="alert" className="text-ui-fg-error">
                  {error}
                </Text>
              )}
            </div>
          </FocusModal.Body>
        </FocusModal.Content>
      </FocusModal>
    </>
  )
}
