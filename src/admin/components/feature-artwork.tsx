import { useQuery } from "@tanstack/react-query"
import { sdk } from "../lib/client"
import CatalogArtwork from "./catalog-artwork"
export default function FeatureArtwork({
  kind,
  id,
}: {
  kind: "category" | "collection"
  id: string
}) {
  const config = useQuery({
    queryKey: ["extra-images-config"],
    queryFn: () =>
      sdk.client.fetch<{ categories: boolean; collections: boolean }>(
        "/admin/catalog-images/config"
      ),
    retry: false,
  })
  if (
    !(kind === "category" ? config.data?.categories : config.data?.collections)
  )
    return null
  return <CatalogArtwork kind={kind} id={id} />
}
