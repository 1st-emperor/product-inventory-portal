import type { Product, ProductChange, ProductPage } from './types';
export const PAGE_SIZE = 10;
export const sorts = ['default', 'price_asc', 'price_desc', 'title_asc', 'title_desc'] as const;
export type Sort = typeof sorts[number];
export interface Filters {
    search: string;
    category: string;
    sort: Sort;
    page: number;
}
export const defaults: Filters = { search: '', category: '', sort: 'default', page: 1 };
export function parseFilters(params: Pick<URLSearchParams, 'get'>): Filters {
    const rawSort = params.get('sort');
    const page = Number(params.get('page'));
    return { search: (params.get('search') ?? '').trim(), category: params.get('category') ?? '', sort: sorts.find(s => s === rawSort) ?? 'default', page: Number.isSafeInteger(page) && page > 0 && page <= Math.floor(Number.MAX_SAFE_INTEGER / PAGE_SIZE) ? page : 1 };
}
export function serializeFilters(f: Filters) {
    const p = new URLSearchParams();
    if (f.search)
        p.set('search', f.search);
    if (f.category)
        p.set('category', f.category);
    if (f.sort !== 'default')
        p.set('sort', f.sort);
    if (f.page !== 1)
        p.set('page', String(f.page));
    return p.toString();
}
export function matches(p: Product, f: Filters) {
    const q = f.search.toLowerCase();
    return (!f.category || p.category === f.category) && (!q || [p.title, p.description, p.brand, p.category].some(v => v?.toLowerCase().includes(q)));
}
export function sortProducts(items: Product[], sort: Sort) {
    return [...items].sort((a, b) => {
        switch (sort) {
            case 'price_asc': return a.price - b.price;
            case 'price_desc': return b.price - a.price;
            case 'title_asc': return a.title.localeCompare(b.title);
            case 'title_desc': return b.title.localeCompare(a.title);
            default: return a.id - b.id;
        }
    });
}
export function applyChanges(items: Product[], changes: ProductChange[], includeMissingUpdates = false) {
    let result = [...items];
    for (const c of changes) {
        if (c.kind === 'create')
            result = [...result.filter(p => p.id !== c.product.id), c.product];
        else if (c.kind === 'delete')
            result = result.filter(p => p.id !== c.id);
        else {
            if (includeMissingUpdates && c.before && !result.some(p => p.id === c.id))
                result.push({ ...c.before, ...c.patch });
            else
                result = result.map(p => p.id === c.id ? { ...p, ...c.patch } : p);
        }
    }
    return result;
}
export function paginate(items: Product[], f: Filters): ProductPage {
    const filtered = sortProducts(items.filter(p => matches(p, f)), f.sort);
    const skip = (f.page - 1) * PAGE_SIZE;
    return { products: filtered.slice(skip, skip + PAGE_SIZE), total: filtered.length, skip, limit: PAGE_SIZE };
}
// Keep remote search matches for unchanged rows; only re-evaluate locally edited/created products.
export function reconcileCandidates(items: Product[], changes: ProductChange[], filters: Filters): ProductPage {
    const changed = new Set(changes.map(c => c.kind === 'create' ? c.product.id : c.id));
    const merged = applyChanges(items, changes, true).filter(p => !changed.has(p.id) || matches(p, filters));
    return paginate(merged, { ...filters, search: '' });
}
export function requestUrl(f: Filters, all = false) {
    const p = new URLSearchParams({ limit: all ? '0' : String(PAGE_SIZE), skip: all ? '0' : String((f.page - 1) * PAGE_SIZE) });
    if (f.sort !== 'default') {
        const [key, order] = f.sort.split('_');
        p.set('sortBy', key);
        p.set('order', order);
    }
    let endpoint = 'products';
    if (f.search) {
        endpoint += '/search';
        p.set('q', f.search);
    }
    else if (f.category)
        endpoint += `/category/${encodeURIComponent(f.category)}`;
    return `${endpoint}?${p}`;
}
export function money(amount: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount); }
