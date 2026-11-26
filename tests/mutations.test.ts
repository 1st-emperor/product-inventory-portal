import { expect, it, vi } from "vitest";
import { waitFor } from "@testing-library/react";
import { http, HttpResponse, delay } from "msw";
import { makeStore } from "../src/store";
import { runChange } from "../src/features/inventory/mutations";
import { productApi } from "../src/features/inventory/api";
import { defaults } from "../src/features/inventory/filters";
import { base, server } from "./server";
import type { Product } from "../src/features/inventory/types";

vi.mock("../src/features/inventory/failure", () => ({
  shouldSimulateFailure: () => false,
}));

const p: Product = {
  id: 1,
  title: "Phone",
  category: "smartphones",
  description: "Phone",
  price: 10,
  stock: 2,
};

it("rolls back a failed mutation, then retries successfully and reconciles the cache", async () => {
  const store = makeStore();

  server.use(
    http.get(`${base}/products`, () =>
      HttpResponse.json({
        products: [p],
        total: 1,
        skip: 0,
        limit: 10,
      }),
    ),

    http.put(`${base}/products/1`, async () => {
      await delay(30);

      return new HttpResponse(null, {
        status: 500,
      });
    }),
  );

  const query = store.dispatch(
    productApi.endpoints.getProducts.initiate(defaults),
  );

  const selectProducts = productApi.endpoints.getProducts.select(defaults);

  try {
    const initialData = await query.unwrap();

    expect(initialData.products[0].stock).toBe(2);

    const change = {
      kind: "update",
      id: 1,
      before: p,
      patch: { stock: 5 },
    } as const;

    const request = store.dispatch(runChange(change));

    // Verify optimistic change
    expect(store.getState().inventory.pending).toEqual(change);

    // Verify failed API request
    await expect(request).rejects.toMatchObject({
      status: 500,
    });

    // Verify rollback
    expect(store.getState().inventory).toMatchObject({
      pending: null,
      changes: [],
      revision: 0,
    });

    expect(selectProducts(store.getState()).data?.products[0]?.stock).toBe(2);

    // Replace failed response with successful response
    server.use(
      http.put(`${base}/products/1`, () =>
        HttpResponse.json({
          ...p,
          stock: 5,
        }),
      ),
    );

    // Retry mutation
    await expect(store.dispatch(runChange(change))).resolves.toBe(true);

    expect(store.getState().inventory.revision).toBe(1);

    // Wait until cache reconciliation finishes
    await waitFor(() => {
      const result = selectProducts(store.getState());

      expect(result.isSuccess).toBe(true);
      expect(result.data?.revision).toBe(1);
      expect(result.data?.products[0]?.stock).toBe(5);
    });
  } finally {
    query.unsubscribe();
    store.dispatch(productApi.util.resetApiState());
  }
});
