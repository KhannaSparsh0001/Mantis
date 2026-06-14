"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

interface ManualResource {
  name: string;
  size: string;
  type: "PDF" | "Video" | "Link";
  url: string;
}

interface ProductDetail {
  id: string;
  name: string;
  manufacturer: string;
  category: string;
  added: string;
  description: string;
  specifications: { label: string; value: string }[];
  commonIssues: { title: string; count: number; initialQuery: string }[];
  resources: ManualResource[];
  svgIcon: React.ReactNode;
}

export default function ProductDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [activeTab, setActiveTab] = useState<"overview" | "specs" | "issues">("overview");

  // Mock Database of Products
  const productDb: Record<string, ProductDetail> = {
    "xiaomi-scooter-4-pro": {
      id: "xiaomi-scooter-4-pro",
      name: "Xiaomi Mi Electric Scooter 4 Pro",
      manufacturer: "Xiaomi",
      category: "Electric Scooters",
      added: "May 15, 2024",
      description: "High-performance electric scooter with dual front and rear disk brakes, a double suspension system, and an smart BMS long-range battery system.",
      svgIcon: (
        <svg className="h-32 w-32 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="18" r="3" />
          <path d="M6 15h11a1 1 0 001-1V5a1 1 0 00-1-1H9" />
        </svg>
      ),
      specifications: [
        { label: "Max Speed", value: "25 km/h (15.5 mph)" },
        { label: "Range", value: "Up to 55 km" },
        { label: "Motor Power", value: "350W Nominal (700W Peak)" },
        { label: "Brakes", value: "eABS Front + Dual-pad Rear Disc" },
        { label: "Tires", value: "10-inch Self-sealing Tubeless" },
        { label: "IP Rating", value: "IPX4 water-resistant" },
      ],
      commonIssues: [
        { title: "Scooter won't turn on", count: 24, initialQuery: "My scooter is completely dead and won't turn on." },
        { title: "Battery not charging", count: 18, initialQuery: "The charging indicator is green but the battery is empty." },
        { title: "Error code E4", count: 15, initialQuery: "The scooter screen shows error code E4." },
        { title: "Brake problems", count: 12, initialQuery: "The rear mechanical brake feels loose." },
      ],
      resources: [
        { name: "Xiaomi Scooter 4 Pro User Manual (EN)", size: "4.8 MB", type: "PDF", url: "#" },
        { name: "First-Time Riding Guide & Safety Rules", size: "1.2 MB", type: "PDF", url: "#" },
        { name: "Unboxing & Assembly Walkthrough", size: "4:15 mins", type: "Video", url: "#" },
        { name: "Manufacturer Official Support Site", size: "External Link", type: "Link", url: "https://mi.com" },
      ],
    },
    "sony-wh1000xm5": {
      id: "sony-wh1000xm5",
      name: "Sony WH-1000XM5 Headphones",
      manufacturer: "Sony",
      category: "Audio",
      added: "May 14, 2024",
      description: "Premium wireless noise-canceling headphones with HD Noise Canceling Processor QN1, and multiple mics for industry-leading call quality.",
      svgIcon: (
        <svg className="h-32 w-32 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9M3 14v3a2 2 0 002 2h2v-6H5a2 2 0 00-2 2zm16-1v6h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2z" />
        </svg>
      ),
      specifications: [
        { label: "Battery Life", value: "Up to 30 hours (ANC On)" },
        { label: "Bluetooth", value: "v5.2, LDAC, AAC, SBC" },
        { label: "Driver Unit", value: "30mm specially designed dome type" },
        { label: "Microphones", value: "8 microphones for Active Noise Canceling" },
        { label: "Charging", value: "USB-C quick charge (3m for 3h playback)" },
        { label: "Weight", value: "250g" },
      ],
      commonIssues: [
        { title: "ANC not blocking sound", count: 14, initialQuery: "The Active Noise Canceling is not working properly." },
        { title: "Bluetooth connection dropping", count: 11, initialQuery: "The headphones keep disconnecting from my phone." },
        { title: "Touch controls unresponsive", count: 9, initialQuery: "The right ear cup touch gestures do not respond." },
      ],
      resources: [
        { name: "Sony WH-1000XM5 Help Guide (PDF)", size: "6.1 MB", type: "PDF", url: "#" },
        { name: "Sony Headphones Connect App Integration Guide", size: "2.4 MB", type: "PDF", url: "#" },
        { name: "Official Sony Firmware Update Portal", size: "External Link", type: "Link", url: "#" },
      ],
    },
  };

  // Fallback Product Detail for other IDs
  const defaultProduct: ProductDetail = {
    id: id,
    name: id.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" "),
    manufacturer: "Generic",
    category: "Accessories",
    added: "Recently",
    description: "Intelligent consumer product registered under Mantis diagnostic support database.",
    svgIcon: (
      <svg className="h-32 w-32 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="12" cy="12" r="4" />
      </svg>
    ),
    specifications: [
      { label: "Status", value: "Verified Manual" },
      { label: "Database Code", value: id },
    ],
    commonIssues: [
      { title: "Device is unresponsive", count: 5, initialQuery: "The device is dead and won't turn on." },
      { title: "Resetting back to factory defaults", count: 3, initialQuery: "How do I factory reset this device?" },
    ],
    resources: [
      { name: "Official User Quickstart Guide", size: "2.5 MB", type: "PDF", url: "#" },
    ],
  };

  const product = productDb[id] || defaultProduct;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
        <Link href="/" className="hover:text-mantis-green transition-colors">Home</Link>
        <span className="text-slate-400">/</span>
        <Link href="/products" className="hover:text-mantis-green transition-colors">Products</Link>
        <span className="text-slate-400">/</span>
        <span className="text-slate-700 font-bold truncate max-w-[200px]">{product.name}</span>
      </nav>

      {/* Main Back Header */}
      <div className="mt-4">
        <Link
          href="/products"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-700 hover:text-mantis-green transition-colors"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Marketplace
        </Link>
      </div>

      {/* Product Header Card */}
      <div className="mt-6 grid grid-cols-1 gap-8 rounded-3xl border border-slate-200/80 bg-white p-6 md:p-8 shadow-sm md:grid-cols-12">
        {/* Product Image Panel */}
        <div className="md:col-span-4 flex items-center justify-center rounded-2xl bg-slate-50 p-6 aspect-square max-h-[320px] mx-auto md:w-full">
          {product.svgIcon}
        </div>

        {/* Product Meta Details */}
        <div className="md:col-span-8 flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="inline-flex items-center rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-inset ring-green-600/10">
                Verified Manual
              </span>
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-600/10">
                Up to date
              </span>
            </div>
            
            <h1 className="mt-4 font-display text-2xl font-extrabold text-slate-900 md:text-3xl leading-snug">
              {product.name}
            </h1>
            
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs font-semibold text-slate-500 uppercase tracking-wide">
              <p>Manufacturer: <span className="text-slate-800 font-bold">{product.manufacturer}</span></p>
              <p>Category: <span className="text-slate-800 font-bold">{product.category}</span></p>
              <p>Added: <span className="text-slate-800 font-bold">{product.added}</span></p>
            </div>
            
            <p className="mt-5 text-sm text-slate-600 leading-relaxed max-w-2xl">
              {product.description}
            </p>
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={`/diagnostics?product=${product.id}`}
              className="flex h-11 items-center justify-center rounded-lg bg-mantis-green px-6 font-semibold text-white shadow-sm hover:bg-mantis-green-dark transition-colors"
            >
              Ask About This Product
            </Link>
            <button className="flex h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-6 font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download Manual
            </button>
          </div>
        </div>
      </div>

      {/* Main Specs & Resources Section */}
      <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left side tabs: Overview, Specifications */}
        <div className="lg:col-span-8 flex flex-col">
          {/* Tabs header */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("overview")}
              className={`pb-4 text-sm font-semibold border-b-2 px-4 transition-all ${
                activeTab === "overview"
                  ? "border-mantis-green text-mantis-green"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab("specs")}
              className={`pb-4 text-sm font-semibold border-b-2 px-4 transition-all ${
                activeTab === "specs"
                  ? "border-mantis-green text-mantis-green"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              Specifications
            </button>
          </div>

          {/* Tabs content */}
          <div className="mt-6 flex-1 rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm">
            {activeTab === "overview" && (
              <div>
                <h2 className="font-display text-lg font-bold text-slate-800">Support Overview</h2>
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">
                  This product has verified diagnostic guidelines loaded. You can chat with the AI Diagnostic Assistant
                  to investigate issues, review manual pages, and run recommended troubleshooting checklists.
                </p>
                <div className="mt-6 p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="mt-0.5 rounded-full bg-green-50 p-1 text-mantis-green">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="text-xs">
                    <h4 className="font-bold text-slate-800">AI Technician Ready</h4>
                    <p className="mt-1 text-slate-500 leading-relaxed">
                      Our assistant conducts structured diagnostics. Rather than just searching, it runs systematic elimination steps to identify faults.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "specs" && (
              <div>
                <h2 className="font-display text-lg font-bold text-slate-800">Technical Specifications</h2>
                <dl className="mt-4 grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
                  {product.specifications.map((spec, index) => (
                    <div key={index} className="border-b border-slate-100 pb-2">
                      <dt className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{spec.label}</dt>
                      <dd className="mt-1 text-sm font-semibold text-slate-800">{spec.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>

          {/* Popular Issues (Bottom Left) */}
          <div className="mt-8">
            <h2 className="font-display text-lg font-bold text-slate-800">Popular Issues</h2>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {product.commonIssues.map((issue, idx) => (
                <Link
                  key={idx}
                  href={`/diagnostics?product=${product.id}&query=${encodeURIComponent(issue.initialQuery)}`}
                  className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-white p-4 hover:shadow-md hover:border-slate-300 transition-all group cursor-pointer"
                >
                  <div>
                    <h3 className="font-semibold text-slate-800 text-sm group-hover:text-mantis-green transition-colors">
                      {issue.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400 font-medium">{issue.count} questions logged</p>
                  </div>
                  <div className="rounded-full bg-slate-50 p-1.5 text-slate-400 group-hover:bg-green-50 group-hover:text-mantis-green transition-colors">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Right side: Knowledge Repository list */}
        <div className="lg:col-span-4">
          <h2 className="font-display text-lg font-bold text-slate-800">Knowledge Repository</h2>
          <div className="mt-4 flex flex-col gap-3">
            {product.resources.map((res, idx) => (
              <a
                key={idx}
                href={res.url}
                className="flex items-center gap-4 rounded-xl border border-slate-200/80 bg-white p-4 hover:shadow-md hover:border-slate-300 transition-all group"
              >
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                  res.type === "PDF" 
                    ? "bg-red-50 text-red-600" 
                    : res.type === "Video"
                    ? "bg-blue-50 text-blue-600"
                    : "bg-purple-50 text-purple-600"
                }`}>
                  {res.type === "PDF" && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  )}
                  {res.type === "Video" && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                  {res.type === "Link" && (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 text-xs truncate group-hover:text-mantis-green transition-colors">
                    {res.name}
                  </h4>
                  <p className="mt-1 text-[11px] text-slate-400 font-medium">{res.size}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
