import { afterEach, expect, it, vi } from "vitest"
import { render, screen, cleanup, waitFor } from "@testing-library/react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
const fetch = vi.hoisted(() => vi.fn())
vi.mock("../../src/admin/lib/client", () => ({ sdk: { client: { fetch } } }))
vi.mock("../../src/admin/components/catalog-artwork", () => ({
  default: ({ kind }: any) => <div>{kind + " image panel"}</div>,
}))
vi.mock("@medusajs/admin-sdk", () => ({
  defineWidgetConfig: (value: any) => value,
}))
import Category from "../../src/admin/widgets/category-artwork"
import Collection from "../../src/admin/widgets/collection-artwork"
afterEach(cleanup)
it("hides each widget consistently for all four independent feature combinations", async () => {
  for (const categories of [false, true])
    for (const collections of [false, true]) {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false, gcTime: 0 } },
      })
      fetch.mockResolvedValue({ categories, collections })
      render(
        <QueryClientProvider client={client}>
          <Category data={{ id: "category" } as any} />
          <Collection data={{ id: "collection" } as any} />
        </QueryClientProvider>
      )
      await waitFor(() =>
        expect(client.getQueryState(["extra-images-config"])?.status).toBe(
          "success"
        )
      )
      expect(Boolean(screen.queryByText("category image panel"))).toBe(
        categories
      )
      expect(Boolean(screen.queryByText("collection image panel"))).toBe(
        collections
      )
      cleanup()
    }
})
it("fails closed while feature configuration is unavailable", async () => {
  fetch.mockRejectedValue(new Error("Unavailable"))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const view = render(
    <QueryClientProvider client={client}>
      <Category data={{ id: "category" } as any} />
    </QueryClientProvider>
  )
  await waitFor(() =>
    expect(client.getQueryState(["extra-images-config"])?.status).toBe("error")
  )
  expect(view.container).toBeEmptyDOMElement()
})
