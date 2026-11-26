import { expect, it } from "vitest";

import inventory, {
  beginChange,
  commitChange,
  rollbackChange,
  setFilters,
  setView,
} from "../src/features/inventory/slice";
import { defaults } from "../src/features/inventory/filters";

import draft, {
  clearDraft,
  saveDraft,
} from "../src/features/wizard/draftSlice";

import { initialValues } from "../src/features/wizard/schema";
import {
  readDraft,
  removeDraft,
  writeDraft,
} from "../src/features/wizard/storage";

it("updates filters and view", () => {
  const state = inventory(
    undefined,
    setFilters({ ...defaults, search: "phone", page: 2 }),
  );
  expect(state.filters.page).toBe(2);
  expect(inventory(state, setView("cards")).view).toBe("cards");
});

it("rolls back pending updates and commits successful writes", () => {
  const change = { kind: "delete", id: 1 } as const;
  const state = inventory(undefined, beginChange(change));
  expect(state.pending).toEqual(change);
  expect(inventory(state, rollbackChange()).pending).toBeNull();
  expect(inventory(state, rollbackChange()).changes).toEqual([]);
  expect(inventory(state, commitChange(change))).toMatchObject({
    pending: null,
    changes: [change],
    revision: 1,
  });
});

it("saves and clears drafts", () => {
  const saved = { step: 2, values: initialValues };
  const state = draft(undefined, saveDraft(saved));
  expect(state.saved).toEqual(saved);
  expect(draft(state, clearDraft()).saved).toBeNull();
});

it("handles draft storage and malformed or inaccessible data", () => {
  const saved = { step: 1, values: initialValues };
  expect(readDraft(localStorage)).toBeNull();
  expect(writeDraft(localStorage, saved)).toBe(true);
  expect(readDraft(localStorage)).toEqual(saved);
  removeDraft(localStorage);
  expect(readDraft(localStorage)).toBeNull();
  for (const raw of [
    "{",
    "null",
    "{}",
    '{"step":8,"values":{}}',
    '{"step":1,"values":null}',
    '{"step":1,"values":{}}',
  ])
    expect(readDraft({ getItem: () => raw })).toBeNull();
  expect(
    readDraft({
      getItem: () => {
        throw Error();
      },
    }),
  ).toBeNull();
  expect(
    writeDraft(
      {
        setItem: () => {
          throw Error();
        },
      },
      saved,
    ),
  ).toBe(false);
  expect(() =>
    removeDraft({
      removeItem: () => {
        throw Error();
      },
    }),
  ).not.toThrow();
});
