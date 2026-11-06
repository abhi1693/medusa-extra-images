import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
const fetch = vi.hoisted(() => vi.fn())
vi.mock("../../src/admin/lib/client", () => ({ sdk: { client: { fetch } } }))
vi.mock("@medusajs/ui", () => ({
  Text: ({ children, ...p }: any) => <p {...p}>{children}</p>,
  Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
  Input: (p: any) => <input {...p} />,
  Button: ({ children, size, variant, ...p }: any) => (
    <button {...p}>{children}</button>
  ),
}))
import Picker from "../../src/admin/components/existing-media-picker"
const onSelect = vi.fn(),
  onClose = vi.fn()
function mount(kind: "collection" | "category" = "collection", busy = false) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={client}>
        <Picker
          kind={kind}
          id="owner"
          busy={busy}
          onSelect={onSelect}
          onClose={onClose}
        />
      </QueryClientProvider>
    ),
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  fetch.mockResolvedValue({
    products: [
      { id: "prod_a", title: "A", thumbnail: "https://example.com/a.png" },
      { id: "prod_b", title: "B", images: [] },
      {
        id: "prod_c",
        title: "C",
        thumbnail: "https://example.com/c.png",
        images: [{ id: "img_c", url: "https://example.com/c.png" }],
      },
    ],
    count: 25,
  })
})
afterEach(cleanup)
it("keeps search and pagination within the owner and selects existing media without uploading", async () => {
  const { user, container } = mount("category")
  expect(screen.getByText("Loading media…")).toBeInTheDocument()
  await screen.findByRole("button", { name: "Select A image 1" })
  expect(container.querySelectorAll("img")).toHaveLength(2)
  expect(screen.getByText("No media on this product.")).toBeInTheDocument()
  await user.click(screen.getByRole("button", { name: "Select A image 1" }))
  expect(onSelect).toHaveBeenCalledWith("https://example.com/a.png", "prod_a")
  await user.click(screen.getByRole("button", { name: "Next media" }))
  await waitFor(() =>
    expect(fetch).toHaveBeenLastCalledWith(
      "/admin/catalog-images/category/owner/media",
      { query: { q: "", offset: 12 } }
    )
  )
  await user.click(screen.getByRole("button", { name: "Previous media" }))
  await user.type(screen.getByLabelText("Find product media"), "A")
  await waitFor(() =>
    expect(fetch).toHaveBeenLastCalledWith(
      "/admin/catalog-images/category/owner/media",
      { query: { q: "A", offset: 0 } }
    )
  )
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  expect(onClose).toHaveBeenCalled()
  expect(screen.queryByLabelText(/Upload/)).toBeNull()
})
it("handles empty member media without broadening to unrelated products", async () => {
  fetch.mockResolvedValue({ products: [], count: 0 })
  mount()
  expect(
    await screen.findByText("No products match this search.")
  ).toBeInTheDocument()
  expect(screen.getByRole("button", { name: "Next media" })).toBeDisabled()
})
it("reports denied media access without a manual-refresh control", async () => {
  fetch.mockRejectedValue(new Error("Denied"))
  mount()
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Product view permission"
  )
  expect(screen.queryByRole("button", { name: /Retry|Reload/ })).toBeNull()
})
it("prevents changing the selection during a save", async () => {
  mount("collection", true)
  expect(
    await screen.findByRole("button", { name: "Select A image 1" })
  ).toBeDisabled()
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
})
