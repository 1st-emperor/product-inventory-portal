import * as yup from "yup";

const positive = yup
  .number()
  .typeError("Enter a valid number")
  .required("Required")
  .moreThan(0, "Must be greater than zero");

const variationSchema = yup.object({
  color: yup.string().trim().required("Color is required"),
  size: yup.string().trim().required("Size is required"),
  sku: yup
    .string()
    .trim()
    .required("SKU is required")
    .matches(/^SKU-[A-Z]{3}-[0-9]{4}$/, "Use SKU-RED-1001 format"),
  extraPrice: yup.number().typeError("Enter a valid number").min(0).required(),
});

export const wizardSchema = yup
  .object({
    title: yup.string().trim().required("Title is required").min(3).max(100),
    brand: yup.string().trim().required("Brand is required"),
    category: yup.string().required("Category is required"),
    description: yup
      .string()
      .trim()
      .required("Description is required")
      .min(20),
    price: positive,
    stock: yup
      .number()
      .typeError("Enter a valid number")
      .integer()
      .min(0)
      .required(),
    discountPercentage: yup
      .number()
      .transform((value: number, original: unknown) =>
        original === "" ? undefined : value,
      )
      .min(0)
      .max(99)
      .optional(),
    variations: yup
      .array()
      .of(variationSchema)
      .required()
      .test(
        "unique-skus",
        "Duplicate SKU codes are not allowed",
        function (items) {
          const seen = new Set<string>();
          for (const [index, item] of (items ?? []).entries()) {
            if (seen.has(item.sku))
              return this.createError({
                path: `${this.path}[${index}].sku`,
                message: "Duplicate SKU code",
              });
            seen.add(item.sku);
          }
          return true;
        },
      ),
    weight: positive,
    dimensions: yup
      .object({ width: positive, height: positive, depth: positive })
      .required(),
    fragile: yup.boolean().required(),
    hazardousDisclaimer: yup
      .boolean()
      .defined()
      .when("fragile", {
        is: true,
        then: (s) => s.oneOf([true], "You must accept the disclaimer"),
      }),
    shippingNotes: yup
      .string()
      .defined()
      .when("fragile", {
        is: true,
        then: (s) => s.trim().required("Shipping notes are required").min(10),
      }),
  })
  .required();

export type WizardValues = yup.InferType<typeof wizardSchema>;
export const initialValues: WizardValues = {
  title: "",
  brand: "",
  category: "",
  description: "",
  price: 0,
  stock: 0,
  discountPercentage: undefined,
  variations: [],
  weight: 0,
  dimensions: { width: 0, height: 0, depth: 0 },
  fragile: false,
  hazardousDisclaimer: false,
  shippingNotes: "",
};
