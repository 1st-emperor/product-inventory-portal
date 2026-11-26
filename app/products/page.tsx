import { Suspense } from 'react';
import { Inventory } from '../../src/features/inventory/Inventory';
export default function ProductsPage() { return <Suspense fallback={<p role="status">Loading inventory…</p>}>
<Inventory />
</Suspense>; }
