"use client";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAppDispatch, useAppSelector } from "../../store";
import { button, input, primary } from "../../components/styles";
import {
  useGetCategoriesQuery,
  useGetProductQuery,
  useGetProductsQuery,
} from "./api";
import {
  applyChanges,
  defaults,
  money,
  PAGE_SIZE,
  parseFilters,
  serializeFilters,
  type Filters,
  type Sort,
} from "./filters";
import { setFilters, setView } from "./slice";
import type { Product, ProductChange } from "./types";
import { runChange } from "./mutations";
type Edit = {
  before: Product;
  id: number;
  title: string;
  price: number;
  stock: number;
};
function Thumbnail({ product }: { product: Product }) {
  return (
    <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-slate-100">
      {product.thumbnail ? (
        <Image
          src={product.thumbnail}
          alt=""
          fill
          sizes="48px"
          className="object-contain"
        />
      ) : (
        <span className="flex h-full items-center justify-center text-xs text-slate-500">
          N/A
        </span>
      )}
    </div>
  );
}
function Stock({ value }: { value: number }) {
  return (
    <span
      className={`rounded-full px-2 py-1 text-xs font-medium ${value === 0 ? "bg-rose-100 text-rose-800" : value < 10 ? "bg-amber-100 text-amber-800" : "bg-emerald-100 text-emerald-800"}`}
    >
      {value === 0 ? "Out of stock" : `${value} in stock`}
    </span>
  );
}
export function Inventory() {
  const params = useSearchParams();
  const urlKey = serializeFilters(parseFilters(params));
  const dispatch = useAppDispatch();
  const { filters, view, pending, changes, revision } = useAppSelector(
    (s) => s.inventory,
  );
  const [search, setSearch] = useState(() => parseFilters(params).search);
  const latest = useRef(parseFilters(params));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [edit, setEdit] = useState<Edit | null>(null);
  const [details, setDetails] = useState<Product | null>(null);
  const detailQuery = useGetProductQuery(details?.id ?? 0, {
    skip: !details || details.id < 0,
  });
  const [confirm, setConfirm] = useState<Product | null>(null);
  const [toast, setToast] = useState<{
    text: string;
    retry?: ProductChange;
  } | null>(null);
  useEffect(() => {
    const next = parseFilters(new URLSearchParams(urlKey));
    latest.current = next;
    dispatch(setFilters(next));
  }, [urlKey, dispatch]);
  const urlSearch = parseFilters(params).search;
  useEffect(() => {
    setSearch(urlSearch);
    if (timer.current) clearTimeout(timer.current);
  }, [urlSearch]);
  useEffect(() => {
    const cancel = () => {
      if (timer.current) clearTimeout(timer.current);
      setSearch(
        parseFilters(new URLSearchParams(window.location.search)).search,
      );
    };
    window.addEventListener("popstate", cancel);
    return () => {
      window.removeEventListener("popstate", cancel);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  useEffect(() => {
    const close = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setDrawer(false);
        setEdit(null);
        setConfirm(null);
        setDetails(null);
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, []);
  function navigate(next: Filters, replace = false) {
    latest.current = next;
    dispatch(setFilters(next));
    const query = serializeFilters(next);
    const href = `/products${query ? `?${query}` : ""}`;
    if (replace) window.history.replaceState(null, "", href);
    else window.history.pushState(null, "", href);
  }
  function filter(patch: Partial<Filters>) {
    navigate({ ...latest.current, ...patch, page: 1 });
  }
  function changeSearch(value: string) {
    setSearch(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      navigate({ ...latest.current, search: value.trim(), page: 1 }, true);
    }, 300);
  }
  const synced = serializeFilters(filters) === urlKey;
  const query = useGetProductsQuery(filters, { skip: !synced });
  const categories = useGetCategoriesQuery();
  const data = synced ? query.currentData : undefined;
  const stale =
    data && data.revision < revision ? changes.slice(data.revision) : [];
  const overlay = pending ? [...stale, pending] : stale;
  const rows = applyChanges(
    data?.products ?? [],
    overlay.filter((c) => c.kind !== "create"),
  );
  const total = Math.max(
    0,
    (data?.total ?? 0) -
      overlay.filter(
        (c) => c.kind === "delete" && data?.products.some((p) => p.id === c.id),
      ).length,
  );
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  useEffect(() => {
    if (
      synced &&
      data &&
      data.revision === revision &&
      !pending &&
      filters.page > Math.max(1, Math.ceil(data.total / PAGE_SIZE))
    ) {
      const next = {
        ...filters,
        page: Math.max(1, Math.ceil(data.total / PAGE_SIZE)),
      };
      dispatch(setFilters(next));
      const q = serializeFilters(next);
      window.history.replaceState(null, "", `/products${q ? `?${q}` : ""}`);
    }
  }, [synced, data, revision, pending, filters, dispatch]);
  async function mutate(change: ProductChange) {
    if (change.kind === "create") return;
    setToast(null);
    try {
      const applied = await dispatch(runChange(change));
      if (applied)
        setToast({
          text:
            change.kind === "delete" ? "Product deleted." : "Product updated.",
        });
    } catch {
      setToast({
        text: "Request failed. Your previous data was restored.",
        retry: change,
      });
    }
  }
  function saveEdit(e: FormEvent) {
    e.preventDefault();
    if (
      !edit ||
      !edit.title.trim() ||
      !Number.isFinite(edit.price) ||
      edit.price <= 0 ||
      !Number.isInteger(edit.stock) ||
      edit.stock < 0
    )
      return;
    const { before, id, title, price, stock } = edit;
    setEdit(null);
    void mutate({
      kind: "update",
      id,
      before,
      patch: { title: title.trim(), price, stock },
    });
  }
  function actions(p: Product) {
    return (
      <div className="flex flex-wrap gap-2">
        <button
          className={button}
          onClick={() => setDetails(p)}
          aria-label={`View ${p.title}`}
        >
          View
        </button>
        <button
          className={button}
          disabled={!!pending}
          onClick={() =>
            setEdit({
              before: p,
              id: p.id,
              title: p.title,
              price: p.price,
              stock: p.stock,
            })
          }
          aria-label={`Edit ${p.title}`}
        >
          Edit
        </button>
        <button
          className={`${button} text-rose-700`}
          disabled={!!pending}
          onClick={() => setConfirm(p)}
          aria-label={`Delete ${p.title}`}
        >
          Delete
        </button>
      </div>
    );
  }
  const filterControls = (
    <>
      <label className="block text-sm font-medium">
        Category
        <select
          className={`${input} mt-1`}
          value={filters.category}
          onChange={(e) => filter({ category: e.target.value })}
        >
          <option value="">All categories</option>
          {categories.data?.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      {categories.isError && (
        <button className={button} onClick={() => categories.refetch()}>
          Retry categories
        </button>
      )}
      <label className="block text-sm font-medium">
        Sort by
        <select
          className={`${input} mt-1`}
          value={filters.sort}
          onChange={(e) => filter({ sort: e.target.value as Sort })}
        >
          <option value="default">Default</option>
          <option value="price_asc">Price: low to high</option>
          <option value="price_desc">Price: high to low</option>
          <option value="title_asc">Name: A–Z</option>
          <option value="title_desc">Name: Z–A</option>
        </select>
      </label>
      <button
        className={button}
        onClick={() => {
          if (timer.current) clearTimeout(timer.current);
          setSearch("");
          navigate(defaults);
        }}
      >
        Clear filters
      </button>
    </>
  );
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
            Inventory management
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight">Products</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage products, pricing and available stock.
          </p>
        </div>
        <Link href="/products/new" className={primary}>
          + New product
        </Link>
      </div>
      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm lg:grid-cols-[2fr_1fr_1fr_auto] lg:items-end">
        <label className="block text-sm font-medium">
          Search products
          <input
            className={`${input} mt-1`}
            placeholder="Search by product name…"
            value={search}
            onChange={(e) => changeSearch(e.target.value)}
          />
        </label>
        <div className="hidden lg:contents">{filterControls}</div>
        <button
          className={`${button} lg:hidden`}
          onClick={() => setDrawer(true)}
        >
          Filters & sorting
        </button>
      </div>
      {
        <div
          inert={!drawer}
          aria-hidden={!drawer}
          className={`fixed inset-0 z-40 overflow-hidden transition-opacity lg:hidden ${drawer ? "opacity-100" : "pointer-events-none opacity-0"}`}
        >
          <button
            aria-label="Close filters"
            className="absolute inset-0 bg-slate-950/40"
            onClick={() => setDrawer(false)}
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            className={`absolute right-0 top-0 flex h-full w-80 max-w-full flex-col gap-5 bg-white p-6 shadow-xl transition-transform duration-300 ${drawer ? "translate-x-0" : "translate-x-full"}`}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">Filters</h2>
              <button className={button} onClick={() => setDrawer(false)}>
                Close
              </button>
            </div>
            {filterControls}
            <button className={primary} onClick={() => setDrawer(false)}>
              Show results
            </button>
          </aside>
        </div>
      }
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4">
          <div>
            <h2 className="font-semibold">Product directory</h2>
            <p className="text-sm text-slate-500">
              {data ? `${total} products` : "Loading…"}{" "}
              {query.isFetching && data && " · Updating…"}
            </p>
          </div>
          <div className="flex gap-1" aria-label="View mode">
            {(["table", "cards"] as const).map((v) => (
              <button
                key={v}
                className={`${button} ${view === v ? "border-indigo-500 bg-indigo-50 text-indigo-700" : ""}`}
                aria-pressed={view === v}
                onClick={() => dispatch(setView(v))}
              >
                {v === "table" ? "Table" : "Cards"}
              </button>
            ))}
          </div>
        </div>
        {query.isError && (
          <div
            role="alert"
            className="m-4 rounded-lg bg-rose-50 p-4 text-rose-800"
          >
            Could not load products.{" "}
            <button className="underline" onClick={() => query.refetch()}>
              Retry
            </button>
          </div>
        )}
        {!data && !query.isError ? (
          <div
            role="status"
            aria-label="Loading products"
            className="space-y-3 p-5"
          >
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className="h-14 animate-pulse rounded-lg bg-slate-100"
              />
            ))}
          </div>
        ) : data && rows.length === 0 ? (
          <div className="p-12 text-center">
            <h3 className="font-semibold">No products found</h3>
            <p className="mt-2 text-sm text-slate-500">
              Try another search or clear filters.
            </p>
          </div>
        ) : view === "table" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-215 text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {["Product", "Category", "Price", "Stock", "Actions"].map(
                    (h) => (
                      <th key={h} scope="col" className="px-4 py-3">
                        {h}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Thumbnail product={p} />
                        <div>
                          <p className="font-medium">{p.title}</p>
                          <p className="text-xs text-slate-500">
                            {p.brand ?? "Unbranded"}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 capitalize">
                      {p.category.replaceAll("-", " ")}
                    </td>
                    <td className="px-4 py-3 font-medium">{money(p.price)}</td>
                    <td className="px-4 py-3">
                      <Stock value={p.stock} />
                    </td>
                    <td className="px-4 py-3">{actions(p)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rows.map((p) => (
              <article
                key={p.id}
                className="space-y-3 rounded-xl border border-slate-200 p-4"
              >
                <Thumbnail product={p} />
                <p className="text-xs capitalize text-slate-500">
                  {p.category.replaceAll("-", " ")}
                </p>
                <h3 className="font-semibold">{p.title}</h3>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold">{money(p.price)}</span>
                  <Stock value={p.stock} />
                </div>
                {actions(p)}
              </article>
            ))}
          </div>
        )}
        {data && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 p-4 text-sm">
            <span className="text-slate-500">
              Page {filters.page} of {pages}
            </span>
            <div className="flex gap-2">
              <button
                className={button}
                disabled={filters.page <= 1}
                onClick={() =>
                  navigate({ ...latest.current, page: filters.page - 1 })
                }
              >
                Previous
              </button>
              <button
                className={button}
                disabled={filters.page >= pages}
                onClick={() =>
                  navigate({ ...latest.current, page: filters.page + 1 })
                }
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
      <p className="text-xs text-slate-500">
        Demo API · Updates are simulated and retained for this app session only.
        New demo products are managed locally.
      </p>
      {details && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Product details"
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
          >
            <div className="flex items-center gap-3">
              <Thumbnail product={details} />
              <div>
                <h2 className="text-xl font-bold">{details.title}</h2>
                <p className="text-sm text-slate-500">
                  {details.brand ?? "Unbranded"}
                </p>
              </div>
            </div>
            {detailQuery.isFetching ? (
              <p role="status">Loading details…</p>
            ) : (
              <p className="text-sm text-slate-600">
                {detailQuery.currentData?.description ?? details.description}
              </p>
            )}
            {detailQuery.isError && (
              <p role="alert" className="text-sm text-rose-700">
                Could not load latest details.{" "}
                <button
                  className="underline"
                  onClick={() => detailQuery.refetch()}
                >
                  Retry
                </button>
              </p>
            )}
            <p className="font-medium">
              {money(details.price)} · {details.stock} in stock
            </p>
            <button className={button} onClick={() => setDetails(null)}>
              Close
            </button>
          </section>
        </div>
      )}
      {edit && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <form
            role="dialog"
            aria-modal="true"
            aria-label="Edit product"
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6 shadow-xl"
            onSubmit={saveEdit}
          >
            <h2 className="text-xl font-bold">Edit product</h2>
            <label className="block text-sm">
              Title
              <input
                required
                maxLength={100}
                className={input}
                value={edit.title}
                onChange={(e) => setEdit({ ...edit, title: e.target.value })}
              />
            </label>
            <label className="block text-sm">
              Price
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                className={input}
                value={edit.price}
                onChange={(e) =>
                  setEdit({ ...edit, price: e.target.valueAsNumber })
                }
              />
            </label>
            <label className="block text-sm">
              Stock
              <input
                required
                type="number"
                min="0"
                step="1"
                className={input}
                value={edit.stock}
                onChange={(e) =>
                  setEdit({ ...edit, stock: e.target.valueAsNumber })
                }
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className={button}
                onClick={() => setEdit(null)}
              >
                Cancel
              </button>
              <button className={primary}>Save changes</button>
            </div>
          </form>
        </div>
      )}
      {confirm && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm deletion"
            className="w-full max-w-md space-y-4 rounded-xl bg-white p-6"
          >
            <h2 className="text-xl font-bold">Delete product?</h2>
            <p>Delete {confirm.title} from the inventory?</p>
            <div className="flex justify-end gap-2">
              <button className={button} onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                className="rounded-lg bg-rose-700 px-4 py-2 text-white"
                onClick={() => {
                  const id = confirm.id;
                  setConfirm(null);
                  void mutate({ kind: "delete", id });
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div
          role={toast.retry ? "alert" : "status"}
          className={`fixed bottom-5 right-5 z-50 max-w-[calc(100%-2.5rem)] rounded-lg p-4 text-sm text-white shadow-lg ${toast.retry ? "bg-rose-800" : "bg-emerald-800"}`}
        >
          <p>{toast.text}</p>
          <div className="mt-2 flex gap-4">
            {toast.retry && (
              <button
                className="font-semibold underline"
                disabled={!!pending}
                onClick={() => {
                  if (toast.retry) void mutate(toast.retry);
                }}
              >
                Retry
              </button>
            )}
            <button className="underline" onClick={() => setToast(null)}>
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
