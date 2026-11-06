import CatalogArtwork from "../../src/admin/components/catalog-artwork"
import { afterEach, beforeEach, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
const mock = vi.hoisted(() => ({
  fetch: vi.fn(),
  success: vi.fn(),
  list: vi.fn(),
}))
vi.mock("../../src/admin/lib/client", () => ({
  sdk: { client: { fetch: mock.fetch } },
}))
vi.mock("@medusajs/admin-sdk", () => ({
  defineWidgetConfig: (v: unknown) => v,
}))
vi.mock("@medusajs/ui", () => {
  const Box = ({ children }: any) => <div>{children}</div>
  const Button = ({ children, variant, size, asChild, ...props }: any) => (
    <button {...props}>{children}</button>
  )
  const Menu = Object.assign(Box, { Trigger: Box, Content: Box, Item: Button })
  const Modal = Object.assign(
    ({ open, children }: any) =>
      open ? <div role="dialog">{children}</div> : null,
    { Content: Box, Header: Box, Body: Box }
  )
  const CommandBar = Object.assign(
    ({ open, children }: any) => (open ? <div>{children}</div> : null),
    {
      Bar: Box,
      Value: Box,
      Seperator: () => null,
      Command: ({ action, label }: any) => (
        <button onClick={action}>{label}</button>
      ),
    }
  )
  return {
    Container: Box,
    Heading: ({ children }: any) => <h2>{children}</h2>,
    Text: ({ children, ...p }: any) => <p {...p}>{children}</p>,
    Label: ({ children, ...p }: any) => <label {...p}>{children}</label>,
    Input: (p: any) => <input {...p} />,
    Button,
    IconButton: Button,
    DropdownMenu: Menu,
    FocusModal: Modal,
    CommandBar,
    Checkbox: ({ onCheckedChange, ...p }: any) => (
      <input type="checkbox" {...p} onChange={onCheckedChange} />
    ),
    toast: { success: mock.success },
  }
})
import Collection, {
  config as collectionConfig,
} from "../../src/admin/widgets/collection-artwork"
import Category, {
  config as categoryConfig,
} from "../../src/admin/widgets/category-artwork"
let stored: any
function mount(kind = "collection") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  return {
    user: userEvent.setup(),
    ...render(
      <QueryClientProvider client={client}>
        <CatalogArtwork
          kind={kind as "collection" | "category"}
          id={kind === "collection" ? "pcol_a" : "pcat_a"}
        />
      </QueryClientProvider>
    ),
  }
}
beforeEach(() => {
  vi.clearAllMocks()
  stored = { url: "https://example.com/existing.png", revision: "one" }
  mock.list.mockResolvedValue({
    products: [
      {
        id: "prod_a",
        title: "Member",
        images: [{ id: "img_a", url: "https://example.com/new.png" }],
      },
    ],
    count: 1,
  })
  mock.fetch.mockImplementation(async (path, options) => {
    if (path.endsWith("/media")) return mock.list()
    if (options?.method === "POST")
      stored = { url: options.body.url, revision: "two" }
    return { image: structuredClone(stored) }
  })
})
afterEach(cleanup)
it("uses native Media presentation and scoped selection without unwanted controls", async () => {
  expect(collectionConfig.zone).toBe("product_collection.details")
  expect(categoryConfig.zone).toBe("product_category.details")
  const { user } = mount()
  expect(screen.getByText("Loading media…")).toBeInTheDocument()
  await screen.findByRole("button", { name: "Change collection image" })
  expect(screen.getByRole("img")).toHaveAttribute("src", stored.url)
  expect(screen.queryByLabelText(/Image URL|Alternative text/)).toBeNull()
  expect(screen.queryByText(/Reload|Upload|thumbnail/)).toBeNull()
  await user.click(screen.getByRole("button", { name: "Edit image" }))
  await user.click(
    await screen.findByRole("button", { name: "Select Member image 1" })
  )
  await waitFor(() => expect(mock.success).toHaveBeenCalledWith("Image saved"))
  expect(mock.fetch).toHaveBeenCalledWith(
    "/admin/catalog-images/collection/pcol_a",
    {
      method: "POST",
      body: {
        url: "https://example.com/new.png",
        product_id: "prod_a",
        revision: "one",
      },
    }
  )
  expect(screen.queryByRole("dialog")).toBeNull()
})
it("removes only the category association and allows choosing from an empty state", async () => {
  const { user } = mount("category")
  await screen.findByRole("button", { name: "Change category image" })
  const select = screen.getByRole("checkbox", { name: "Select category image" })
  await user.click(select)
  await user.click(select)
  expect(screen.queryByRole("button", { name: "Remove" })).toBeNull()
  await user.click(select)
  await user.click(screen.getByRole("button", { name: "Remove" }))
  await screen.findByRole("button", { name: "Add image" })
  expect(stored.url).toBeNull()
  expect(screen.queryByRole("img")).toBeNull()
  await user.click(screen.getByRole("button", { name: "Add image" }))
  await screen.findByRole("button", { name: "Select Member image 1" })
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  expect(screen.queryByRole("dialog")).toBeNull()
})
it("opens the picker from the native image tile", async () => {
  const { user } = mount()
  await user.click(
    await screen.findByRole("button", { name: "Change collection image" })
  )
  expect(await screen.findByRole("dialog")).toBeInTheDocument()
})
it("handles denied reads and a missing response safely", async () => {
  mock.fetch.mockRejectedValueOnce(new Error("Denied"))
  mount()
  expect(await screen.findByRole("alert")).toHaveTextContent(
    "Could not load media"
  )
  cleanup()
  mock.fetch.mockResolvedValueOnce({})
  mount()
  await waitFor(() => expect(screen.queryByText("Loading media…")).toBeNull())
})
it.each([new Error("Artwork changed. Reopen the media selector."), "denied"])(
  "retains the saved image after failed changes and invalidates query state",
  async (error) => {
    const { user } = mount()
    await user.click(
      await screen.findByRole("button", { name: "Change collection image" })
    )
    await screen.findByRole("button", { name: "Select Member image 1" })
    const original = mock.fetch.getMockImplementation()!
    mock.fetch.mockImplementation(async (path, options) => {
      if (options?.method === "POST") throw error
      return original(path, options)
    })
    await user.click(
      screen.getByRole("button", { name: "Select Member image 1" })
    )
    await waitFor(() =>
      expect(screen.getAllByRole("alert")[0]).toHaveTextContent(
        error instanceof Error ? "Reopen" : "Could not save"
      )
    )
    expect(stored.url).toBe("https://example.com/existing.png")
  }
)
