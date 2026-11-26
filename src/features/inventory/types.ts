export interface Product {
    id: number;
    title: string;
    brand?: string;
    category: string;
    description: string;
    price: number;
    stock: number;
    thumbnail?: string;
    discountPercentage?: number;
    weight?: number;
    dimensions?: {
        width: number;
        height: number;
        depth: number;
    };
}
export interface ProductPage {
    products: Product[];
    total: number;
    skip: number;
    limit: number;
}
export interface Category {
    slug: string;
    name: string;
    url: string;
}
export type ProductChange = {
    kind: 'update';
    id: number;
    before?: Product;
    patch: Partial<Pick<Product, 'title' | 'price' | 'stock'>>;
} | {
    kind: 'delete';
    id: number;
} | {
    kind: 'create';
    product: Product;
};
