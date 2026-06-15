"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface DBProduct {
  id: string;
  title?: string;
  description?: string;
  company_id?: string | null;
  image_url?: string | null;
  created_at?: string;
  tags?: string[];
}

const iconShapes = [
  <svg key="scooter" className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
    <circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
    <path d="M6 15h11a1 1 0 001-1V5a1 1 0 00-1-1H9" />
  </svg>,
  <svg key="cube" className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="12" cy="12" r="4" />
  </svg>,
  <svg key="chip" className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
    <path d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
    <rect x="9" y="9" width="6" height="6" rx="1" />
  </svg>,
  <svg key="box" className="h-16 w-16 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
    <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>,
];

function ProductsCatalogContent() {
  const searchParams = useSearchParams();
  const { role, companies, getCompanyName, getAccessToken, refreshCompanies } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [dbProducts, setDbProducts] = useState<DBProduct[]>([]);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchProducts = async () => {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const res = await fetch("http://localhost:8000/api/products", { headers });
      if (res.ok) {
        setDbProducts(await res.json());
      }
    } catch {}
  };

  useEffect(() => {
    fetchProducts();
  }, [getAccessToken]);

  const filteredProducts = useMemo(() => {
    return dbProducts.filter((product) => {
      const name = product.title || product.id;
      const desc = product.description || "";
      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCompany = selectedCompanyFilter === "all" ||
        (selectedCompanyFilter === "none" && !product.company_id) ||
        product.company_id === selectedCompanyFilter;
      return matchesSearch && matchesCompany;
    });
  }, [searchQuery, selectedCompanyFilter, dbProducts]);

  const handleEdit = async (productId: string) => {
    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/products/${productId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          tags: editTags ? editTags.split(",").map(t => t.trim()) : [],
        }),
      });
      if (res.ok) {
        setEditingId(null);
        fetchProducts();
      } else {
        const err = await res.json();
        console.error("Edit failed:", err.error);
      }
    } catch {}
  };

  const handleDelete = async (productId: string) => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/products/${productId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setDeletingId(null);
        fetchProducts();
      } else if (res.status === 403) {
        setDeletingId(null);
        await refreshCompanies();
      } else {
        const err = await res.json();
        console.error("Delete failed:", err.error);
        setDeletingId(null);
      }
    } catch {
      setDeletingId(null);
    }
  };

  const canEdit = (product: DBProduct): boolean => {
    if (role === "admin") return true;
    if (!product.company_id) return false;
    return companies.some(c => c.id === product.company_id);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/60 dark:border-slate-800 pb-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50">Product Marketplace</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Browse registered products, download manuals, and start active diagnostics.
          </p>
        </div>

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

      <div className="mt-6 flex flex-wrap gap-2 items-center">
        <div className="ml-auto">
          <select
            value={selectedCompanyFilter}
            onChange={(e) => setSelectedCompanyFilter(e.target.value)}
            className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
          >
            <option value="all">All Companies</option>
            <option value="none">Unassociated</option>
            {companies.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="rounded-2xl border border-red-200/80 dark:border-red-900/30 bg-white dark:bg-slate-900 p-6 shadow-xl max-w-sm w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="font-display font-bold text-slate-800 dark:text-slate-200">Delete Product</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  This will permanently delete the product, its manual PDF, and all MOSS search index entries.
                </p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeletingId(null)}
                className="rounded-lg border border-slate-200/80 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deletingId)}
                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 transition-colors cursor-pointer"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredProducts.map((product, idx) => {
          const editable = canEdit(product);
          const isEditing = editingId === product.id;
          return (
            <div
              key={product.id}
              className="flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-sm hover:shadow-md dark:hover:shadow-slate-950/40 hover:border-slate-300 dark:hover:border-slate-700 transition-all group relative"
            >
              {product.company_id ? (
                <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 text-[9px] font-bold text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-600/10">
                  {getCompanyName(product.company_id) || 'Associated'}
                </span>
              ) : (
                <span className="absolute top-3 right-3 inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                  Unassociated
                </span>
              )}

              <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-950 overflow-hidden mb-4 mt-2">
                {product.image_url ? (
                  <img src={product.image_url} alt={product.title || product.id} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex items-center justify-center p-4">
                    {iconShapes[idx % iconShapes.length]}
                  </div>
                )}
              </div>

              {isEditing ? (
                <div className="space-y-3 flex-1 flex flex-col">
                  <h2 className="font-display text-lg font-bold text-slate-800 dark:text-slate-200">
                    {product.title || product.id}
                  </h2>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder="Product title"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
                  />
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Product description"
                    rows={2}
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white resize-none"
                  />
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Tags (comma-separated)"
                    className="w-full rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
                  />
                  <div className="mt-auto flex gap-2">
                    <button
                      onClick={() => handleEdit(product.id)}
                      className="flex-1 rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="flex-1 rounded-lg border border-slate-200/80 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col">
                  <h2 className="mt-3 font-display text-lg font-bold text-slate-800 dark:text-slate-200 group-hover:text-mantis-green transition-colors leading-snug line-clamp-1">
                    {product.title || product.id}
                  </h2>

                  {product.description && (
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed flex-1 line-clamp-2">
                      {product.description}
                    </p>
                  )}

                  {!product.description && (
                    <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 italic leading-relaxed flex-1">
                      No description
                    </p>
                  )}

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

                  {editable && (
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => {
                          setEditingId(product.id);
                          setEditTitle(product.title || "");
                          setEditDescription(product.description || "");
                          setEditTags(product.tags?.join(", ") || "");
                        }}
                        className="flex-1 rounded-lg border border-slate-200/80 dark:border-slate-800 py-1.5 text-[10px] font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeletingId(product.id)}
                        className="flex-1 rounded-lg border border-red-200 dark:border-red-900/30 text-red-500 py-1.5 text-[10px] font-semibold hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredProducts.length === 0 && (
          <div className="col-span-full py-16 text-center">
            <svg className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-4 text-base font-bold text-slate-700 dark:text-slate-300">No products found</h3>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500">Create a product from the dashboard to get started.</p>
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
