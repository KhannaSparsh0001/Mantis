"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface ProductData {
  id: string;
  title?: string;
  description?: string;
  company_id?: string | null;
  pdf_url?: string | null;
  image_url?: string | null;
  tags?: string[];
  created_at?: string;
}

interface ResourceData {
  id: string;
  product_id: string;
  type: "pdf" | "image" | "video" | "link";
  url: string;
  title?: string;
  size?: number;
  created_at: string;
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [product, setProduct] = useState<ProductData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resources, setResources] = useState<ResourceData[]>([]);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`);
        if (res.ok) {
          const all: ProductData[] = await res.json();
          const found = all.find((p) => p.id === id);
          setProduct(found || null);
        }
      } catch {
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const fetchResources = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products/${id}/resources`);
      if (res.ok) {
        const data = await res.json();
        setResources(data.resources || []);
      }
    } catch {}
  };

  useEffect(() => {
    if (id) fetchResources();
  }, [id]);

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 items-center justify-center text-sm font-semibold text-slate-400">
          Loading...
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex h-64 flex-col items-center justify-center gap-3">
          <svg className="h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h2 className="font-display text-lg font-bold text-slate-700">Product Not Found</h2>
          <Link href="/products" className="text-sm font-semibold text-mantis-green hover:text-mantis-green-dark transition-colors">
            Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const images = resources.filter((r) => r.type === "image");
  const videos = resources.filter((r) => r.type === "video");
  const pdfs = resources.filter((r) => r.type === "pdf");
  const links = resources.filter((r) => r.type === "link");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        <Link href="/" className="hover:text-mantis-green transition-colors">Home</Link>
        <span className="text-slate-400">/</span>
        <Link href="/products" className="hover:text-mantis-green transition-colors">Products</Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-700 dark:text-slate-300 font-bold truncate max-w-[200px]">{product.title || product.id}</span>
      </nav>

      <div className="mt-4">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-mantis-green dark:hover:text-mantis-green transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Marketplace
        </Link>
      </div>

      {/* Hero Section */}
      <div className="mt-6 grid grid-cols-1 gap-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm md:grid-cols-12">
        <div className="md:col-span-5 flex items-center justify-center rounded-2xl bg-slate-50 dark:bg-slate-950 p-6 aspect-square max-h-[400px] mx-auto md:w-full overflow-hidden">
          {product.image_url ? (
            <img src={product.image_url} alt={product.title || product.id} className="max-h-full max-w-full object-contain" />
          ) : (
            <svg className="h-32 w-32 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="12" cy="12" r="4" />
            </svg>
          )}
        </div>

        <div className="md:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap gap-2 items-center">
              {product.company_id && (
                <span className="inline-flex items-center rounded-full bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 text-xs font-semibold text-blue-700 dark:text-blue-300 ring-1 ring-inset ring-blue-600/10">
                  Company Product
                </span>
              )}
              {product.pdf_url && (
                <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950/40 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-600/10">
                  Manual Uploaded
                </span>
              )}
              {images.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-purple-50 dark:bg-purple-950/40 px-2.5 py-0.5 text-xs font-semibold text-purple-700 dark:text-purple-300 ring-1 ring-inset ring-purple-600/10">
                  {images.length} Photo{images.length > 1 ? "s" : ""}
                </span>
              )}
              {videos.length > 0 && (
                <span className="inline-flex items-center rounded-full bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300 ring-1 ring-inset ring-rose-600/10">
                  {videos.length} Video{videos.length > 1 ? "s" : ""}
                </span>
              )}
            </div>

            <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-900 dark:text-slate-50 md:text-3xl leading-snug">
              {product.title || product.id}
            </h1>

            <p className="mt-5 text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
              {product.description || "No description available for this product."}
            </p>

            {product.tags && product.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {product.tags.map((tag, i) => (
                  <span key={i} className="rounded-full bg-slate-100 dark:bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={`/diagnostics?product=${product.id}`}
              className="flex h-11 items-center justify-center rounded-lg bg-mantis-green px-6 font-semibold text-white shadow-sm hover:bg-mantis-green-dark transition-colors"
            >
              Ask About This Product
            </Link>
            {product.pdf_url && (
              <a
                href={product.pdf_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download Manual
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Image Gallery */}
      {images.length > 0 && (
        <div className="mt-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-6">Photos</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => setActiveImage(img.url)}
                className="group relative aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:border-mantis-green dark:hover:border-mantis-green transition-all cursor-pointer"
              >
                <img src={img.url} alt={img.title || ""} className="h-full w-full object-cover" />
                {img.title && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[10px] font-semibold text-white truncate">{img.title}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      {activeImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          onClick={() => setActiveImage(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setActiveImage(null)}
              className="absolute -top-10 right-0 text-white/70 hover:text-white text-sm font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
            <img src={activeImage} alt="" className="w-full h-full max-h-[85vh] object-contain rounded-2xl" />
          </div>
        </div>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <div className="mt-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-6">Videos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {videos.map((vid) => (
              <div key={vid.id} className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
                <video
                  src={vid.url}
                  controls
                  className="w-full aspect-video bg-black"
                  poster={vid.title ? undefined : undefined}
                >
                  Your browser does not support video playback.
                </video>
                {vid.title && (
                  <p className="px-4 py-2.5 text-xs font-semibold text-slate-700 dark:text-slate-300">{vid.title}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Manuals & Links */}
      {(pdfs.length > 0 || links.length > 0) && (
        <div className="mt-8 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm">
          <h2 className="font-display text-lg font-bold text-slate-900 dark:text-slate-50 mb-6">Resources</h2>
          <div className="space-y-3">
            {pdfs.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 px-4 py-3 hover:border-slate-200 dark:hover:border-slate-800 transition-all">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <svg className="h-8 w-8 shrink-0 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{r.title || "Manual"}</p>
                    {r.size && <p className="text-[10px] text-slate-400">{(r.size / 1024).toFixed(1)} KB</p>}
                  </div>
                </div>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-mantis-green px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-mantis-green-dark transition-colors">
                  Download
                </a>
              </div>
            ))}
            {links.map((r) => (
              <div key={r.id} className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 px-4 py-3 hover:border-slate-200 dark:hover:border-slate-800 transition-all">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <svg className="h-8 w-8 shrink-0 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-3.293l-4.5-4.5a4.5 4.5 0 10-6.364 6.364l1.757 1.757" />
                  </svg>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{r.title || "Link"}</p>
                  </div>
                </div>
                <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-lg bg-mantis-green px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-mantis-green-dark transition-colors">
                  Open
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
