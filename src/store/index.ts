import { configureStore } from "@reduxjs/toolkit";
import { useDispatch, useSelector, useStore } from "react-redux";
import inventory from "../features/inventory/slice";
import draft from "../features/wizard/draftSlice";
import { productApi } from "../features/inventory/api";

export const makeStore = () =>
  configureStore({
    reducer: { inventory, draft, [productApi.reducerPath]: productApi.reducer },
    middleware: (getDefault) => getDefault().concat(productApi.middleware),
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
export const useAppStore = useStore.withTypes<AppStore>();
