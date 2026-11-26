import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";
import { http, HttpResponse } from "msw";
import { Provider } from "react-redux";
import { makeStore } from "../src/store";
import { Wizard } from "../src/features/wizard/Wizard";
import { base, server } from "./server";

it("submits all wizard steps through the real RTK Query mutation intercepted by MSW", async () => {
  let body: unknown;
  server.use(
    http.post(`${base}/products/add`, async ({ request }) => {
      body = await request.json();
      return HttpResponse.json(
        { id: 195, title: "Demo phone" },
        { status: 201 },
      );
    }),
  );

  const user = userEvent.setup();
  const store = makeStore();
  render(
    <Provider store={store}>
      <Wizard />
    </Provider>,
  );
  const type = async (label: string, value: string) => {
    const field = await screen.findByLabelText(label);
    await user.clear(field);
    await user.type(field, value);
  };

  await type("Product title", "Demo phone");
  await type("Brand", "Demo");
  await screen.findByRole("option", { name: "Smartphones" });
  await user.selectOptions(screen.getByLabelText("Category"), "smartphones");
  await type("Description", "A useful product for daily use.");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await type("Base price (USD)", "99");
  await type("Stock quantity", "3");
  await user.click(screen.getByRole("button", { name: /Add variation/ }));
  await type("Color 1", "Red");
  await type("Size 1", "M");
  await type("SKU code 1", "SKU-RED-1001");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await type("Weight (kg)", "1");
  await type("Width (cm)", "2");
  await type("Height (cm)", "3");
  await type("Depth (cm)", "4");
  await user.click(screen.getByLabelText("Requires Special Fragile Handling"));
  await user.click(screen.getByLabelText("Hazardous Material Disclaimer"));
  await type("Special shipping notes", "Handle with care");
  await user.click(screen.getByRole("button", { name: "Continue" }));
  await user.click(
    await screen.findByRole("button", { name: "Create product" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Product created" }),
  ).toBeInTheDocument();
  expect(body).toMatchObject({
    title: "Demo phone",
    price: 99,
    stock: 3,
    fragile: true,
    variations: [{ sku: "SKU-RED-1001" }],
  });
  expect(store.getState().draft.saved).toBeNull();
  expect(store.getState().inventory.changes).toHaveLength(1);
}, 20000);
