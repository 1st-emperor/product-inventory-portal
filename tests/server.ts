import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

export const base = "https://dummyjson.com";
export const server = setupServer(
  http.get(`${base}/products/categories`, () =>
    HttpResponse.json([
      {
        slug: "smartphones",
        name: "Smartphones",
        url: `${base}/products/category/smartphones`,
      },
    ]),
  ),
);
