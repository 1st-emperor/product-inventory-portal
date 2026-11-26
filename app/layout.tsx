import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { StoreProvider } from "../src/store/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stockroom | Inventory",
  description: "Product and inventory management portal",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <StoreProvider>
          <header className="border-b border-slate-200 bg-white">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-8">
              <Link
                href="/products"
                className="text-xl font-bold tracking-tight text-indigo-700"
              >
                Stockroom<span className="text-slate-400">.</span>
              </Link>
              <Link
                href="/products"
                className="text-sm font-medium text-slate-600 hover:text-indigo-700"
              >
                Inventory
              </Link>
            </div>
          </header>
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-8">
            {children}
          </main>
        </StoreProvider>
      </body>
    </html>
  );
}
