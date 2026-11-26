import { describe, expect, it } from "vitest";
import {
  initialValues,
  wizardSchema,
  type WizardValues,
} from "../src/features/wizard/schema";

export const valid: WizardValues = {
  ...initialValues,
  title: "Demo phone",
  brand: "Demo",
  category: "smartphones",
  description: "A useful product for daily use.",
  price: 100,
  stock: 2,
  weight: 1,
  dimensions: { width: 1, height: 2, depth: 3 },
};

const sku = { color: "Red", size: "M", sku: "SKU-RED-1001", extraPrice: 0 };
describe("Product validation", () => {
  it("accepts valid products and optional discount", async () => {
    await expect(wizardSchema.validate(valid)).resolves.toMatchObject({
      price: 100,
    });
    await expect(
      wizardSchema.validate({ ...valid, discountPercentage: "" }),
    ).resolves.toBeDefined();
  });
  it.each([0, -1, NaN])("rejects invalid price %s", async (price) => {
    await expect(wizardSchema.validate({ ...valid, price })).rejects.toThrow();
  });
  it.each([-1, 1.5])("rejects invalid stock %s", async (stock) => {
    await expect(wizardSchema.validate({ ...valid, stock })).rejects.toThrow();
  });
  it.each([-1, 100])("rejects discount %s", async (discountPercentage) => {
    await expect(
      wizardSchema.validate({ ...valid, discountPercentage }),
    ).rejects.toThrow();
  });

  it("validates title and dimensions", async () => {
    await expect(
      wizardSchema.validate({ ...valid, title: "a" }),
    ).rejects.toThrow();
    await expect(
      wizardSchema.validate({
        ...valid,
        dimensions: { ...valid.dimensions, depth: 0 },
      }),
    ).rejects.toThrow();
  });

  it("accepts valid SKU, rejects invalid and duplicate SKU", async () => {
    await expect(
      wizardSchema.validate({ ...valid, variations: [sku] }),
    ).resolves.toBeDefined();
    await expect(
      wizardSchema.validate({ ...valid, variations: [{ ...sku, sku: "bad" }] }),
    ).rejects.toThrow("SKU-RED-1001");
    await expect(
      wizardSchema.validate({ ...valid, variations: [sku, sku] }),
    ).rejects.toThrow("Duplicate SKU");
  });

  it("requires notes and disclaimer only for fragile products", async () => {
    await expect(
      wizardSchema.validate({
        ...valid,
        fragile: true,
        shippingNotes: "Handle with care",
      }),
    ).rejects.toThrow();
    await expect(
      wizardSchema.validate({
        ...valid,
        fragile: true,
        hazardousDisclaimer: true,
        shippingNotes: "Short",
      }),
    ).rejects.toThrow();
    await expect(
      wizardSchema.validate({
        ...valid,
        fragile: true,
        hazardousDisclaimer: true,
        shippingNotes: "Handle with care",
      }),
    ).resolves.toBeDefined();
  });
});
