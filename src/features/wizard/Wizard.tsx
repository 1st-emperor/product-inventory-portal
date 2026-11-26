"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  FormProvider,
  useFieldArray,
  useForm,
  useFormContext,
  useFormState,
  useWatch,
  type FieldPath,
} from "react-hook-form";

import { yupResolver } from "@hookform/resolvers/yup";
import { useAppDispatch, useAppSelector, useAppStore } from "../../store";
import { button, input, primary } from "../../components/styles";
import {
  productApi,
  useCreateProductMutation,
  useGetCategoriesQuery,
} from "../inventory/api";

import { commitChange } from "../inventory/slice";
import { clearDraft, saveDraft, type Draft } from "./draftSlice";
import { initialValues, wizardSchema, type WizardValues } from "./schema";
import { readDraft, removeDraft, writeDraft } from "./storage";

const steps = [
  "Basic information",
  "Pricing & stock",
  "Shipping details",
  "Review",
];
const stepFields: FieldPath<WizardValues>[][] = [
  ["title", "brand", "category", "description"],
  ["price", "stock", "discountPercentage", "variations"],
  ["weight", "dimensions", "fragile", "hazardousDisclaimer", "shippingNotes"],
];

function Field({
  name,
  label,
  type = "text",
  multiline = false,
  step,
}: {
  name: FieldPath<WizardValues>;
  label: string;
  type?: "text" | "number";
  multiline?: boolean;
  step?: string;
}) {
  const { register, getFieldState, control } = useFormContext<WizardValues>();
  const state = useFormState({ control, name, exact: true });
  const { error } = getFieldState(name, state);
  const id = `field-${name}`;
  const props = {
    id,
    className: `${input} mt-1 ${error ? "border-rose-500" : ""}`,
    "aria-invalid": !!error,
    "aria-describedby": error ? `${id}-error` : undefined,
  };
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {multiline ? (
        <textarea rows={4} {...props} {...register(name)} />
      ) : (
        <input
          type={type}
          step={step}
          {...props}
          {...register(
            name,
            type === "number"
              ? {
                  setValueAs: (v: string) => (v === "" ? undefined : Number(v)),
                }
              : undefined,
          )}
        />
      )}
      {error && (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-xs text-rose-700"
        >
          {error.message}
        </p>
      )}
    </div>
  );
}

function Check({
  name,
  label,
}: {
  name: "fragile" | "hazardousDisclaimer";
  label: string;
}) {
  const { register, control, getFieldState } = useFormContext<WizardValues>();
  const state = useFormState({ control, name, exact: true });
  const { error } = getFieldState(name, state);
  return (
    <div>
      <label className="flex items-start gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 accent-indigo-600"
          {...register(name)}
        />
        {label}
      </label>
      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-700">
          {error.message}
        </p>
      )}
    </div>
  );
}

function Basic() {
  const { register, control, getFieldState } = useFormContext<WizardValues>();
  const state = useFormState({ control, name: "category", exact: true });
  const { error } = getFieldState("category", state);
  const categories = useGetCategoriesQuery();
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field name="title" label="Product title" />
      <Field name="brand" label="Brand" />
      <div className="sm:col-span-2">
        <label htmlFor="category" className="text-sm font-medium">
          Category
        </label>
        <select
          id="category"
          className={`${input} mt-1`}
          aria-invalid={!!error}
          {...register("category")}
        >
          <option value="">
            {categories.isLoading ? "Loading categories…" : "Select category"}
          </option>
          {categories.data?.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
        {categories.isError && (
          <button
            type="button"
            className={button}
            onClick={() => categories.refetch()}
          >
            Retry categories
          </button>
        )}
        {error && (
          <p role="alert" className="text-xs text-rose-700">
            {error.message}
          </p>
        )}
      </div>
      <div className="sm:col-span-2">
        <Field name="description" label="Description" multiline />
      </div>
    </div>
  );
}

const VariationRow = memo(function VariationRow({
  index,
  remove,
}: {
  index: number;
  remove: (index: number) => void;
}) {
  return (
    <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Variation {index + 1}</h4>
        <button
          type="button"
          className={`${button} text-rose-700`}
          onClick={() => remove(index)}
        >
          Remove
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field
          name={`variations.${index}.color`}
          label={`Color ${index + 1}`}
        />
        <Field name={`variations.${index}.size`} label={`Size ${index + 1}`} />
        <Field
          name={`variations.${index}.sku`}
          label={`SKU code ${index + 1}`}
        />
        <Field
          name={`variations.${index}.extraPrice`}
          label={`Extra price ${index + 1}`}
          type="number"
          step="0.01"
        />
      </div>
    </div>
  );
});

function Pricing() {
  const { control } = useFormContext<WizardValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "variations",
  });
  const removeRow = useCallback((i: number) => remove(i), [remove]);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          name="price"
          label="Base price (USD)"
          type="number"
          step="0.01"
        />
        <Field name="stock" label="Stock quantity" type="number" step="1" />
        <Field
          name="discountPercentage"
          label="Discount (%) — optional"
          type="number"
          step="0.01"
        />
      </div>
      <div className="space-y-3 border-t border-slate-200 pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold">SKU variations</h3>
            <p className="text-xs text-slate-500">
              Example: SKU-RED-1001. Each code must be unique.
            </p>
          </div>
          <button
            type="button"
            className={button}
            onClick={() =>
              append({ color: "", size: "", sku: "", extraPrice: 0 })
            }
          >
            + Add variation
          </button>
        </div>
        {!fields.length && (
          <p className="rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
            No variations yet.
          </p>
        )}
        {fields.map((field, i) => (
          <VariationRow key={field.id} index={i} remove={removeRow} />
        ))}
      </div>
    </div>
  );
}

function Shipping() {
  const { control } = useFormContext<WizardValues>();
  const fragile = useWatch({ control, name: "fragile" });
  return (
    <div className="space-y-5">
      <Field name="weight" label="Weight (kg)" type="number" step="0.01" />
      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          name="dimensions.width"
          label="Width (cm)"
          type="number"
          step="0.01"
        />
        <Field
          name="dimensions.height"
          label="Height (cm)"
          type="number"
          step="0.01"
        />
        <Field
          name="dimensions.depth"
          label="Depth (cm)"
          type="number"
          step="0.01"
        />
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
        <Check name="fragile" label="Requires Special Fragile Handling" />
        {fragile && (
          <div className="mt-4 space-y-4">
            <Check
              name="hazardousDisclaimer"
              label="Hazardous Material Disclaimer"
            />
            <Field
              name="shippingNotes"
              label="Special shipping notes"
              multiline
            />
          </div>
        )}
      </div>
    </div>
  );
}

function Review({ edit }: { edit: (step: number) => void }) {
  const { getValues } = useFormContext<WizardValues>();
  const v = getValues();
  const sections = [
    {
      title: steps[0],
      fields: [
        ["Title", v.title],
        ["Brand", v.brand],
        ["Category", v.category],
        ["Description", v.description],
      ],
    },
    {
      title: steps[1],
      fields: [
        ["Base price", `$${v.price}`],
        ["Stock", String(v.stock)],
        ["Discount", `${v.discountPercentage ?? 0}%`],
        ...v.variations.map((x, i) => [
          `Variation ${i + 1}`,
          `${x.color} / ${x.size} / ${x.sku} / +$${x.extraPrice}`,
        ]),
      ],
    },
    {
      title: steps[2],
      fields: [
        ["Weight", `${v.weight} kg`],
        [
          "Dimensions",
          `${v.dimensions.width} × ${v.dimensions.height} × ${v.dimensions.depth} cm`,
        ],
        ["Fragile", v.fragile ? "Yes" : "No"],
        ["Disclaimer", v.hazardousDisclaimer ? "Accepted" : "Not accepted"],
        ["Shipping notes", v.shippingNotes || "—"],
      ],
    },
  ];
  return (
    <div className="space-y-4">
      {sections.map((s, i) => (
        <section
          key={s.title}
          className="rounded-lg border border-slate-200 p-4"
        >
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-semibold">{s.title}</h3>
            <button type="button" className={button} onClick={() => edit(i)}>
              Edit {s.title}
            </button>
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            {s.fields.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className="break-words text-sm font-medium">{value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
    </div>
  );
}

export function Wizard() {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const form = useForm({
    resolver: yupResolver(wizardSchema),
    defaultValues: initialValues,
    mode: "onTouched",
    shouldUnregister: false,
  });
  const { reset, watch, getValues, trigger, handleSubmit } = form;
  const [step, setStep] = useState(0);
  const stepRef = useRef(0);
  const ready = useRef(false);
  const [prompt, setPrompt] = useState<Draft | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [success, setSuccess] = useState(false);
  const [submitError, setSubmitError] = useState(false);
  const [create, status] = useCreateProductMutation();
  const mutationPending = useAppSelector((s) => !!s.inventory.pending);
  useEffect(() => {
    const draft =
      readDraft(window.localStorage) ?? store.getState().draft.saved;
    setPrompt(draft);
    ready.current = !draft;
    setHydrated(true);
  }, [store]);
  const persist = useCallback(
    (next: number) => {
      if (!ready.current) return;
      const draft = { values: structuredClone(getValues()), step: next };
      dispatch(saveDraft(draft));
      setStorageError(!writeDraft(window.localStorage, draft));
    },
    [dispatch, getValues],
  );
  useEffect(() => {
    const sub = watch(() => persist(stepRef.current));
    return () => sub.unsubscribe();
  }, [watch, persist]);
  function go(next: number) {
    stepRef.current = next;
    setStep(next);
    persist(next);
  }
  function resume(accept: boolean) {
    ready.current = false;

    if (accept && prompt) {
      reset(structuredClone(prompt.values));

      stepRef.current = prompt.step;
      setStep(prompt.step);
    } else {
      reset(structuredClone(initialValues));

      stepRef.current = 0;
      setStep(0);

      dispatch(clearDraft());
      removeDraft(window.localStorage);
    }

    setPrompt(null);
    ready.current = true;
  }
  async function next() {
    if (step < 3 && (await trigger(stepFields[step], { shouldFocus: true })))
      go(step + 1);
  }
  const submit = handleSubmit(
    async (values) => {
      if (store.getState().inventory.pending) return;
      setSubmitError(false);
      try {
        const product = await create(values).unwrap();
        dispatch(
          commitChange({
            kind: "create",
            product: { ...product, ...values, id: -Date.now() },
          }),
        );
        dispatch(productApi.util.invalidateTags(["Products"]));
        ready.current = false;
        dispatch(clearDraft());
        removeDraft(window.localStorage);
        setSuccess(true);
      } catch {
        setSubmitError(true);
      }
    },
    (errors) => {
      const index = stepFields.findIndex((fields) =>
        fields.some((f) => f in errors),
      );
      if (index >= 0) go(index);
    },
  );
  if (!hydrated) return <p role="status">Loading product form…</p>;
  if (success)
    return (
      <section className="mx-auto max-w-xl space-y-4 rounded-xl border border-emerald-200 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-emerald-700">Success</p>
        <h1 className="text-2xl font-bold">Product created</h1>
        <p className="text-slate-600">
          The demo product has been added to the current inventory session.
        </p>
        <Link href="/products" className={primary}>
          Back to inventory
        </Link>
      </section>
    );
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Link href="/products" className="text-sm font-medium text-indigo-700">
          ← Back to inventory
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">New product</h1>
        <p className="mt-1 text-sm text-slate-500">
          Complete the product details and review before submitting.
        </p>
      </div>
      <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {steps.map((label, i) => (
          <li
            key={label}
            aria-current={i === step ? "step" : undefined}
            className={`rounded-lg border p-3 text-xs font-medium ${i === step ? "border-indigo-500 bg-indigo-50 text-indigo-800" : i < step ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-500"}`}
          >
            <span className="mb-1 block text-sm font-bold">
              {i < step ? "✓" : `0${i + 1}`}
            </span>
            {label}
          </li>
        ))}
      </ol>

      <FormProvider {...form}>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (step === 3) void submit(e);
            else void next();
          }}
          className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
              Step {step + 1} of 4
            </p>
            <h2 className="mt-1 text-xl font-bold">{steps[step]}</h2>
          </div>
          {step === 0 ? (
            <Basic />
          ) : step === 1 ? (
            <Pricing />
          ) : step === 2 ? (
            <Shipping />
          ) : (
            <Review edit={go} />
          )}{" "}
          {submitError && (
            <p
              role="alert"
              className="rounded-lg bg-rose-50 p-3 text-sm text-rose-800"
            >
              Could not create product. Your draft is saved. Please retry.
            </p>
          )}
          {storageError && (
            <p role="alert" className="text-sm text-amber-800">
              Browser storage unavailable; draft is only saved in memory.
            </p>
          )}
          <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-5">
            <button
              className={button}
              type="button"
              disabled={step === 0 || status.isLoading}
              onClick={() => go(step - 1)}
            >
              Back
            </button>
            <span className="text-xs text-slate-500">
              Draft saves automatically
            </span>
            <button
              type="submit"
              className={primary}
              disabled={status.isLoading || (step === 3 && mutationPending)}
            >
              {step === 3
                ? status.isLoading
                  ? "Creating…"
                  : "Create product"
                : "Continue"}
            </button>
          </div>
        </form>
      </FormProvider>

      {prompt && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Resume saved product draft?"
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
          >
            <h2 className="text-xl font-bold">Resume saved product draft?</h2>
            <p className="text-sm text-slate-600">
              You have an unfinished product from step {prompt.step + 1}.
            </p>
            <div className="flex justify-end gap-2">
              <button className={button} onClick={() => resume(false)}>
                Start over
              </button>
              <button className={primary} onClick={() => resume(true)}>
                Resume draft
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
