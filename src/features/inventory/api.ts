import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { applyChanges, reconcileCandidates, requestUrl, type Filters } from './filters';
import type { Category, Product, ProductPage } from './types';
import type { InventoryState } from './slice';
import type { WizardValues } from '../wizard/schema';
const raw = fetchBaseQuery({ baseUrl: 'https://dummyjson.com/' });
export const productApi = createApi({
    reducerPath: 'productApi', baseQuery: raw, tagTypes: ['Products'], keepUnusedDataFor: 120,
    endpoints: builder => ({
        getProducts: builder.query<ProductPage & {
            revision: number;
        }, Filters>({
            async queryFn(filters, api, _extra, baseQuery) {
                const { changes, revision } = (api.getState() as {
                    inventory: InventoryState;
                }).inventory;
                const combined = Boolean(filters.search && filters.category);
                const local = changes.length > 0;
                // Mock writes do not persist remotely. Reconcile against all matching candidates after a write.
                const result = await baseQuery(requestUrl(filters, local || combined));
                if (result.error)
                    return { error: result.error };
                const data = result.data as ProductPage;
                return { data: { ...(local || combined ? reconcileCandidates(data.products, changes, filters) : data), revision } };
            }, providesTags: ['Products']
        }),
        getCategories: builder.query<Category[], void>({ query: () => 'products/categories' }),
        getProduct: builder.query<Product, number>({
            async queryFn(id, api, _extra, baseQuery) {
                const result = await baseQuery(`products/${id}`);
                if (result.error)
                    return { error: result.error };
                const { changes } = (api.getState() as {
                    inventory: InventoryState;
                }).inventory;
                const [product] = applyChanges([result.data as Product], changes.filter(c => c.kind !== 'create' && c.id === id));
                return product ? { data: product } : { error: { status: 'CUSTOM_ERROR', error: 'Product deleted in this session' } };
            }
        }),
        createProduct: builder.mutation<Product, WizardValues>({ query: body => ({ url: 'products/add', method: 'POST', body }) }),
        updateProduct: builder.mutation<Product, {
            id: number;
            patch: Partial<Pick<Product, 'title' | 'price' | 'stock'>>;
        }>({
            async queryFn({ id, patch }, _api, _extra, baseQuery) {
                if (Math.random() < 0.2) {
                    await new Promise(resolve => setTimeout(resolve, 450));
                    return { error: { status: 'CUSTOM_ERROR', error: 'Simulated network failure' } };
                }
                const result = await baseQuery({ url: `products/${id}`, method: 'PUT', body: patch });
                if (result.error)
                    return { error: result.error };
                return { data: result.data as Product };
            }
        }),
        deleteProduct: builder.mutation<Product, number>({
            async queryFn(id, _api, _extra, baseQuery) {
                if (Math.random() < 0.2) {
                    await new Promise(resolve => setTimeout(resolve, 450));
                    return { error: { status: 'CUSTOM_ERROR', error: 'Simulated network failure' } };
                }
                const result = await baseQuery({ url: `products/${id}`, method: 'DELETE' });
                if (result.error)
                    return { error: result.error };
                return { data: result.data as Product };
            }
        })
    })
});
export const { useGetProductsQuery, useGetCategoriesQuery, useGetProductQuery, useCreateProductMutation, useUpdateProductMutation, useDeleteProductMutation } = productApi;
