import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { WizardValues } from "./schema";

export interface Draft {
  values: WizardValues;
  step: number;
}

interface DraftState {
  saved: Draft | null;
}

const initialState: DraftState = { saved: null };
const slice = createSlice({
  name: "draft",
  initialState,
  reducers: {
    saveDraft(state, action: PayloadAction<Draft>) {
      state.saved = action.payload;
    },
    clearDraft(state) {
      state.saved = null;
    },
  },
});
export const { saveDraft, clearDraft } = slice.actions;
export default slice.reducer;
