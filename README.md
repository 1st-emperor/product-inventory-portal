# Stockroom — Product & Inventory Management Portal

Aplikasi pengelolaan produk dan inventaris yang responsif, dengan fitur pencarian, filter, pengelolaan stok, dan formulir penambahan produk dengan wizard. Data produk menggunakan DummyJSON API.

## Project links

- GitHub: https://github.com/1st-emperor/product-inventory-portal
- Vercel: https://product-inventory-portal.vercel.app/products

## Technology

Next.js (App Router), React, TypeScript (Strict Mode), Redux Toolkit, RTK Query, React Hook Form, Yup, Tailwind CSS, Vitest, React Testing Library, dan MSW.

## Instalasi dan menjalankan aplikasi

Gunakan Node.js 22 LTS atau versi yang kompatibel dengan Next.js 15.

```bash
npm install
npm run dev
```

Buka http://localhost:3000/products.

## Features

### 1. Inventory directory (`/products`)

- Menampilkan daftar, kategori, dan detail produk dari DummyJSON API.
- Pencarian dengan debounce 300 ms, filter kategori, sort harga dan nama, serta pagination 10 produk per halaman.
- Sinkronisasi filter antara URL, Redux, dan cache RTK Query, termasuk saat refresh dan navigasi back/forward.
- Tampilan table dan card, filter drawer pada versi mobile, skeleton loading, serta empty dan error state.
- Optimistic update dan delete, konfirmasi saat delete, rollback, notifikasi error, dan Retry. Simulated failues affect 20% pada operasi update/delete.
- Optimasi gambar menggunakan Next.js Image dan lazy loading.

Contoh URL saat filter digunakan:

```text
/products?search=phone&category=smartphones&sort=price_desc&page=2
```

### 2. Create product (`/products/new`)

Tiga tahap form pengisian dan satu tahap review:

1. **Product information:** nama, merek, kategori, dan deskripsi.
2. **Harga dan stock:** harga, stok, diskon opsional, serta variasi SKU yg dinamis dengan format `SKU-RED-1001` dan tanpa duplikasi.
3. **Delivery:** berat, dimensi, fragile handling, serta disclaimer dan catatan pengiriman yang wajib jika checkbox fragile handling active.
4. **Review:** review dan update data sebelum submit. Draft disimpan di Redux dan localStorage agar dapat dilanjutkan setelah refresh.

Data dikirim melalui `POST /products/add` setelah seluruh validasi berhasil. Produk ditambahkan ke katalog sesi dan draft dihapus setelah request berhasil.

### 3. Automated testing

| File                | Pengujian                                                               |
| ------------------- | ----------------------------------------------------------------------- |
| `schema.test.ts`    | Validasi Yup, format dan keunikan SKU, conditional validation           |
| `filters.test.ts`   | Parameter URL, endpoint API, sorting, pagination, dan rekonsiliasi data |
| `state.test.ts`     | Redux reducer, draft, rollback, dan storage failure paths               |
| `mutations.test.ts` | Update, rollback, retry, dan sinkronisasi cache                         |
| `wizard.test.tsx`   | Alur pengisian hingga submit produk menggunakan RTL dan MSW             |

```bash
npm run typecheck
npm run test
npm run test:coverage
```

Target coverage: minimal 81% untuk lines, statements, functions, dan branches pada schema, helper, dan Redux slice yang dikonfigurasi. Hasil aktual mengikuti laporan coverage.

## Architecture

```text
app/                      Routing dan layout Next.js
src/store/                Konfigurasi Redux store dan typed hooks
src/features/inventory/   API, filter, state, dan pengelolaan produk
src/features/wizard/      Formulir, validasi, dan penyimpanan draft
src/components/           Komponen dan styling yang digunakan bersama
tests/                    Unit dan integration test
```

## Penjelasan Architecture

### 1. Race condition handling

Search menggunakan debounce 300 ms. Timer sebelumnya dibatalkan setiap kali user mengetik. URL menjadi acuan filter dan disinkronkan dengan Redux. Query dijalankan ketika keduanya sudah sesuai.

RTK Query menyimpan cache berdasarkan kombinasi filter. Penggunaan `currentData` memastikan response dari pencarian sebelumnya tidak menggantikan hasil pencarian yg sedang aktif, meskipun request yg lama masih bisa selesai.

### 2. State distribution boundaries

| State           | Tanggung jawab                                                    |
| --------------- | ----------------------------------------------------------------- |
| React state     | Input pencarian sementara, drawer, dialog, dan toast              |
| Redux Toolkit   | Filter aktif, mode tampilan, perubahan produk, dan snapshot draft |
| RTK Query       | Data API, cache, dan status request                               |
| React Hook Form | Nilai input, validasi, dan variasi SKU                            |
| localStorage    | Penyimpanan draft setelah refresh                                 |

Pagination biasa dilakukan melalui API. Untuk kombinasi pencarian dan kategori, hasil pencarian diambil dengan `limit=0`, kemudian difilter dan dipagination di sisi client. Perubahan produk lokal direkonsiliasi sebelum pagination. Produk lokal yang diedit atau ditambahkan dicocokkan berdasarkan nama, deskripsi, merek, dan kategori.

### 3. Re-render optimization

React Hook Form menggunakan uncontrolled input melalui `register`. Variasi SKU dikelola dengan `useFieldArray` dan menggunakan `field.id` sebagai key.

`memo`, callback yang stabil, dan `useFormState` membantu membatasi re-render pada baris variasi. `useWatch` digunakan pada fragile handling, sedangkan subscription form digunakan untuk menyimpan draft tanpa membuat parent component mengikuti seluruh nilai input untuk rendering.

### 4. Resilience strategy

`runChange` menyimpan perubahan sementara ke Redux sehingga tampilan langsung diperbarui sebelum respons API diterima. Cache detail produk yang tersedia diperbarui dengan `updateQueryData`.

Jika request gagal, perubahan sementara dihapus, patch cache detail dibatalkan melalui `undo()`, dan toast menampilkan opsi Retry. Operasi perubahan dijalankan secara berurutan untuk menghindari konflik rollback.

Jika berhasil, perubahan disimpan dalam catatan sesi dan cache daftar diinvalidasi. Hasil refetch direkonsiliasi dengan perubahan lokal untuk memperbarui data, sorting, total, dan pagination.

## Batasan aplikasi

- DummyJSON tidak menyimpan hasil POST, PUT, dan DELETE secara permanen. Perubahan inventory hanya berlaku selama sesi aplikasi; refresh mengembalikan data API, tetapi filter dan draft tetap dapat dipulihkan.
- Produk baru menggunakan ID negatif di sisi client untuk menghindari duplikasi ID. Update dan delete produk tersebut dilakukan secara lokal.
- Form menggunakan tiga tahap input dan satu review, dengan satuan dimensi cm dan harga USD.
- Audit aksesibilitas dan performa browser secara menyeluruh belum dilakukan.

## Deployment

```bash
npm run build
npm start
```

Untuk deployment, import repository GitHub ke Vercel dengan preset Next.js. Pastikan typecheck, pengujian, coverage, dan build berhasil sebelum publikasi.

## Referensi

- [DummyJSON](https://dummyjson.com/docs/products)
- [Redux Toolkit dan RTK Query](https://redux.js.org/toolkit/rtk-query/usage/manual-cache-updates)
- [RTK Query Cache](https://redux.js.org/toolkit/rtk-query/usage/cache-behavior)
- [Redux dengan Next.js](https://redux.js.org/usage/nextjs)
- [Next.js](https://nextjs.org/docs/app/api-reference/functions/use-search-params)
- [React Hook Form](https://react-hook-form.com/docs/usefieldarray)
- [Yup](https://github.com/jquense/yup)
- [MSW](https://mswjs.io/docs/)
