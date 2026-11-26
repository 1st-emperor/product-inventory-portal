import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { defaults, type Filters } from "./filters";
import type { ProductChange } from "./types";
export interface InventoryState {
  filters: Filters;
  view: "table" | "cards";
  pending: ProductChange | null;
  changes: ProductChange[];
  revision: number;
}
const initialState: InventoryState = {
  filters: defaults,
  view: "table",
  pending: null,
  changes: [],
  revision: 0,
};
const slice = createSlice({
  name: "inventory",
  initialState,
  reducers: {
    setFilters(state, action: PayloadAction<Filters>) {
      state.filters = action.payload;
    },
    setView(state, action: PayloadAction<InventoryState["view"]>) {
      state.view = action.payload;
    },
    beginChange(state, action: PayloadAction<ProductChange>) {
      state.pending = action.payload;
    },
    commitChange(state, action: PayloadAction<ProductChange>) {
      state.changes.push(action.payload);
      state.pending = null;
      state.revision++;
    },
    rollbackChange(state) {
      state.pending = null;
    },
  },
});
export const {
  setFilters,
  setView,
  beginChange,
  commitChange,
  rollbackChange,
} = slice.actions;
export default slice.reducer;
