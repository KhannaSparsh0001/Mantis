"use client";

import { useState, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

// Interface for Products
interface Product {
  id: string;
  name: string;
  category: string;
  type: string;
  added: string;
  description: string;
  svgIcon: React.ReactNode;
}

const products: Product[] = [
  {
    id: "xiaomi-scooter-4-pro",
    name: "Xiaomi Mi Electric Scooter 4 Pro",
    category: "Electric Scooters",
    type: "User Manual",
    added: "Added 2 days ago",
    description: "High-performance electric scooter with advanced safety features and long-range battery.",
    svgIcon: (
      <svg className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M6 15h11a1 1 0 001-1V5a1 1 0 00-1-1H9" />
      </svg>
    ),
  },
  {
    id: "sony-wh1000xm5",
    name: "Sony WH-1000XM5 Headphones",
    category: "Audio",
    type: "User Guide",
    added: "Added 3 days ago",
    description: "Premium noise-canceling wireless headphones with exceptional sound and call quality.",
    svgIcon: (
      <svg className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
        <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9M3 14v3a2 2 0 002 2h2v-6H5a2 2 0 00-2 2zm16-1v6h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2z" />
      </svg>
    ),
  },
  {
    id: "canon-eos-r50",
    name: "Canon EOS R50 Camera",
    category: "Cameras",
    type: "Reference Manual",
    added: "Added 5 days ago",
    description: "Compact mirrorless camera designed for content creators, featuring 4K video and high-speed AF.",
    svgIcon: (
      <svg className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
        <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
  },
  {
    id: "dyson-v15",
    name: "Dyson V15 Detect Vacuum",
    category: "Home Appliances",
    type: "User Manual",
    added: "Added 1 week ago",
    description: "Intelligent cordless vacuum with laser dust detection and real-time screen reports.",
    svgIcon: (
      <svg className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
        <path d="M19 11V5a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a4 4 0 01-4 4H9a4 4 0 01-4-4m14 0v9a1 1 0 01-1 1h-2a1 1 0 01-1-1v-5a1 1 0 00-1-1H9a1 1 0 00-1 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-9" />
      </svg>
    ),
  },
  {
    id: "ninebot-max-g2",
    name: "Ninebot MAX G2 Scooter",
    category: "Electric Scooters",
    type: "User Manual",
    added: "Added May 15, 2024",
    description: "Premium electric kick scooter with double suspension and RideyLONG range technology.",
    svgIcon: (
      <svg className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="18" r="3" />
        <path d="M6 15h11a1 1 0 001-1V5a1 1 0 00-1-1H9" />
      </svg>
    ),
  },
  {
    id: "dji-mini-3-pro",
    name: "DJI Mini 3 Pro Drone",
    category: "Accessories",
    type: "User Manual",
    added: "Added May 10, 2024",
    description: "Lightweight and foldable camera drone with 4K HDR video and obstacle sensing.",
    svgIcon: (
      <svg className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 10h3l-4 4-4-4h3V7h2v5z" />
      </svg>
    ),
  },
];

function ProductsCatalogContent() {
  const searchParams = useSearchParams();
  const categoryQuery = searchParams.get("category");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategoryState, setSelectedCategoryState] = useState<string | null>(null);
  const [prevCategoryQuery, setPrevCategoryQuery] = useState(categoryQuery);

  if (categoryQuery !== prevCategoryQuery) {
    setPrevCategoryQuery(categoryQuery);
    setSelectedCategoryState(null);
  }

  const selectedCategory = selectedCategoryState || categoryQuery || "All";
  const categories = ["All", "Electric Scooters", "Audio", "Cameras", "Home Appliances", "Accessories"];

  // Filtering Logic
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "All" || product.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Title Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/60 dark:border-slate-800 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50">Product Marketplace</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Browse registered products, download manuals, and start active diagnostics.
          </p>
        </div>

        {/* Catalog Search */}
        <div className="relative w-full md:w-80">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-slate-400 dark:text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="search"
            placeholder="Search products..."
            className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-2 pl-9 pr-4 text-sm outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:border-mantis-green focus:ring-1 focus:ring-mantis-green dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="mt-6 flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategoryState(cat)}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold tracking-wide transition-all cursor-pointer ${
              selectedCategory === cat
                ? "bg-mantis-green text-white shadow-sm"
                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 hover:border-slate-300 dark:hover:border-slate-700"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Products Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product) => (
          <div
            key={product.id}
            className="flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md dark:hover:shadow-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all group"
          >
            {/* SVG Product Preview */}
            <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-950 p-4 mb-4">
              {product.svgIcon}
            </div>

            {/* Product Metadata */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950/40 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-600/10 dark:ring-green-900/30">
                  {product.category}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">{product.added}</span>
              </div>
              
              <h2 className="mt-3 font-display text-lg font-bold text-slate-800 dark:text-slate-200 group-hover:text-mantis-green transition-colors leading-snug line-clamp-1">
                {product.name}
              </h2>
              
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1 line-clamp-2">
                {product.description}
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex gap-3">
                <Link
                  href={`/products/${product.id}`}
                  className="flex-1 flex h-10 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  View Details
                </Link>
                <Link
                  href={`/diagnostics?product=${product.id}`}
                  className="flex-1 flex h-10 items-center justify-center rounded-lg bg-mantis-green text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors text-center"
                >
                  Diagnose
                </Link>
              </div>
            </div>
          </div>
        ))}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-base font-bold text-slate-700 dark:text-slate-300">No products found</h3>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Try modifying your search queries or category filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ProductsCatalog() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center text-sm font-semibold text-slate-400">
        Loading Products Catalog...
      </div>
    }>
      <ProductsCatalogContent />
    </Suspense>
  );
}
