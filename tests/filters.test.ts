import { expect, it } from "vitest";
import {
  applyChanges,
  defaults,
  matches,
  money,
  paginate,
  parseFilters,
  requestUrl,
  serializeFilters,
  sortProducts,
} from "../src/features/inventory/filters";

import type { Product } from "../src/features/inventory/types";
const p: Product = {
  id: 1,
  title: "Phone",
  description: "Mobile",
  brand: "Demo",
  category: "smartphones",
  price: 10,
  stock: 2,
};

const q: Product = {
  ...p,
  id: 2,
  title: "Book",
  description: "Paper",
  category: "books",
  price: 5,
};

it("round-trips URL filters and rejects malformed values", () => {
  const f = {
    ...defaults,
    search: "phone",
    category: "smartphones",
    sort: "price_desc" as const,
    page: 2,
  };
  expect(parseFilters(new URLSearchParams(serializeFilters(f)))).toEqual(f);
  expect(parseFilters(new URLSearchParams("sort=no&page=-1"))).toEqual(
    defaults,
  );
  expect(serializeFilters(defaults)).toBe("");
  expect(
    parseFilters(new URLSearchParams("page=1.5&search=%20abc%20")).search,
  ).toBe("abc");
});

it("builds paginated, category and search URLs", () => {
  expect(requestUrl(defaults)).toBe("products?limit=10&skip=0");
  expect(requestUrl({ ...defaults, page: 2 })).toContain("skip=10");
  expect(requestUrl({ ...defaults, category: "smartphones" })).toContain(
    "products/category/smartphones",
  );
  expect(
    requestUrl({ ...defaults, search: "phone", sort: "price_desc" }, true),
  ).toContain("limit=0&skip=0&sortBy=price&order=desc&q=phone");
});

it("filters and sorts products", () => {
  expect(
    matches(p, { ...defaults, search: "PHONE", category: "smartphones" }),
  ).toBe(true);
  expect(matches(q, { ...defaults, search: "phone" })).toBe(false);
  expect(matches(p, { ...defaults, category: "books" })).toBe(false);
  expect(matches(p, { ...defaults, search: "mobile" })).toBe(true);
  expect(sortProducts([p, q], "price_asc")).toEqual([q, p]);
  expect(sortProducts([p, q], "price_desc")).toEqual([p, q]);
  expect(sortProducts([p, q], "title_asc")).toEqual([q, p]);
  expect(sortProducts([p, q], "title_desc")).toEqual([p, q]);
  expect(sortProducts([q, p], "default")).toEqual([p, q]);
  expect(paginate([p, q], { ...defaults, search: "phone" })).toMatchObject({
    total: 1,
    products: [p],
  });
  expect(paginate([p, q], { ...defaults, page: 2 }).products).toEqual([]);
  expect(money(10)).toBe("$10.00");
});

it("reconciles updates, creates and deletes without mutating source", () => {
  const result = applyChanges(
    [p, q],
    [
      { kind: "update", id: 1, patch: { stock: 7 } },
      { kind: "delete", id: 2 },
      { kind: "create", product: { ...q, id: 3 } },
    ],
  );
  expect(result.map((x) => [x.id, x.stock])).toEqual([
    [1, 7],
    [3, 2],
  ]);
  expect(p.stock).toBe(2);
  expect(
    applyChanges([p], [{ kind: "create", product: { ...p, stock: 0 } }]),
  ).toEqual([{ ...p, stock: 0 }]);
});

it("reconciles products whose edited title enters a search and preserves unchanged API matches", async () => {
  const { reconcileCandidates } =
    await import("../src/features/inventory/filters");

  const f = { ...defaults, search: "phone" };

  const device: Product = {
    ...p,
    title: "Basic device",
    category: "electronics",
  };

  expect(matches(device, f)).toBe(false);

  expect(
    reconcileCandidates(
      [q],
      [
        {
          kind: "update",
          id: 1,
          before: device,
          patch: { title: "New phone" },
        },
      ],
      f,
    ).products.map((x) => x.id),
  ).toEqual([1, 2]);

  const phone: Product = {
    ...device,
    title: "Phone",
  };

  expect(matches(phone, f)).toBe(true);

  expect(
    reconcileCandidates(
      [phone],
      [
        {
          kind: "update",
          id: 1,
          before: phone,
          patch: { title: "Tablet" },
        },
      ],
      f,
    ).total,
  ).toBe(0);
});

it("preserves edited products when their category still matches the search", async () => {
  const { reconcileCandidates } =
    await import("../src/features/inventory/filters");

  const f = { ...defaults, search: "phone" };

  const result = reconcileCandidates(
    [p],
    [
      {
        kind: "update",
        id: 1,
        before: p,
        patch: { title: "Tablet" },
      },
    ],
    f,
  );

  expect(result.total).toBe(1);
  expect(result.products[0].title).toBe("Tablet");
});
