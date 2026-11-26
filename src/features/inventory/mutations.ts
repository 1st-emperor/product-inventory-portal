import type { AppDispatch, RootState } from "../../store";
import { productApi } from "./api";
import { beginChange, commitChange, rollbackChange } from "./slice";
import type { ProductChange } from "./types";
import { shouldSimulateFailure } from "./failure";
// The list cache remains the confirmed server snapshot. Pending changes are projected by the UI.
// Only one write at a time, so rollback cannot accidentally undo another mutation.
export const runChange =
  (
    change: Exclude<
      ProductChange,
      {
        kind: "create";
      }
    >,
  ) =>
  async (
    dispatch: AppDispatch,
    getState: () => RootState,
  ): Promise<boolean> => {
    if (getState().inventory.pending) return false;
    dispatch(beginChange(change));
    const detailPatch =
      change.kind === "update"
        ? dispatch(
            productApi.util.updateQueryData(
              "getProduct",
              change.id,
              (draft) => {
                Object.assign(draft, change.patch);
              },
            ),
          )
        : undefined;
    try {
      if (change.id < 0) {
        // Synthetic IDs exist only in this browser session, not on DummyJSON.
        await new Promise((resolve) => setTimeout(resolve, 450));
        if (shouldSimulateFailure())
          throw new Error("Simulated network failure");
      } else if (change.kind === "update") {
        const request = dispatch(
          productApi.endpoints.updateProduct.initiate({
            id: change.id,
            patch: change.patch,
          }),
        );
        try {
          await request.unwrap();
        } finally {
          request.reset();
        }
      } else {
        const request = dispatch(
          productApi.endpoints.deleteProduct.initiate(change.id),
        );
        try {
          await request.unwrap();
        } finally {
          request.reset();
        }
      }
      dispatch(commitChange(change));
      dispatch(productApi.util.invalidateTags(["Products"]));
      return true;
    } catch (error) {
      detailPatch?.undo();
      dispatch(rollbackChange());
      throw error;
    }
  };
