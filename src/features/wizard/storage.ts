import type { Draft } from "./draftSlice";
import { initialValues } from "./schema";
const KEY = "stockroom-product-draft-v1";

export function readDraft(storage: Pick<Storage, "getItem">): Draft | null {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !("step" in parsed) ||
      !("values" in parsed) ||
      typeof parsed.step !== "number" ||
      ![0, 1, 2, 3].includes(parsed.step) ||
      !parsed.values ||
      typeof parsed.values !== "object"
    )
      return null;

    const v = parsed.values as Partial<Draft["values"]>;
    if (
      !Array.isArray(v.variations) ||
      !v.dimensions ||
      typeof v.title !== "string"
    )
      return null;
    return {
      step: parsed.step,
      values: {
        ...initialValues,
        ...v,
        dimensions: { ...initialValues.dimensions, ...v.dimensions },
      },
    };
  } catch {
    return null;
  }
}

export function writeDraft(storage: Pick<Storage, "setItem">, draft: Draft) {
  try {
    storage.setItem(KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export function removeDraft(storage: Pick<Storage, "removeItem">) {
  try {
    storage.removeItem(KEY);
  } catch {
    /* Storage can be disabled. */
  }
}
