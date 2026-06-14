"use client";

import Link from "next/link";

export default function Home() {
  const categories = [
    {
      name: "Electric Scooters",
      count: "124 products",
      icon: (
        <svg className="h-8 w-8 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="18" r="3" />
          <path d="M6 15h11a1 1 0 001-1V5a1 1 0 00-1-1H9" />
        </svg>
      ),
    },
    {
      name: "Audio",
      count: "98 products",
      icon: (
        <svg className="h-8 w-8 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.5a6.5 6.5 0 100-13 6.5 6.5 0 000 13z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 16.5a4.5 4.5 0 118 0" />
        </svg>
      ),
    },
    {
      name: "Cameras",
      count: "86 products",
      icon: (
        <svg className="h-8 w-8 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      name: "Home Appliances",
      count: "77 products",
      icon: (
        <svg className="h-8 w-8 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="2" width="16" height="20" rx="2" />
          <line x1="4" y1="10" x2="20" y2="10" />
          <circle cx="12" cy="6" r="1.5" />
          <circle cx="12" cy="15" r="3" />
        </svg>
      ),
    },
    {
      name: "Accessories",
      count: "65 products",
      icon: (
        <svg className="h-8 w-8 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
    },
    {
      name: "View All",
      count: "All categories",
      icon: (
        <svg className="h-8 w-8 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      ),
    },
  ];

  const steps = [
    {
      title: "1. Describe Your Issue",
      desc: "Tell us what's wrong in your own words, like describing a sound or behavior.",
      icon: (
        <svg className="h-6 w-6 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      title: "2. Get AI Guidance",
      desc: "Our AI processes the official manual to suggest tests and isolate possible causes.",
      icon: (
        <svg className="h-6 w-6 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364.364l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
    },
    {
      title: "3. Follow Steps",
      desc: "Follow targeted, step-by-step diagnostic actions with references to manuals.",
      icon: (
        <svg className="h-6 w-6 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
        </svg>
      ),
    },
    {
      title: "4. Problem Solved",
      desc: "Successfully diagnose the fault and implement the recommended safe resolution.",
      icon: (
        <svg className="h-6 w-6 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const recentManuals = [
    {
      id: "xiaomi-scooter-4-pro",
      name: "Xiaomi Mi Electric Scooter 4 Pro",
      type: "User Manual",
      added: "Added 2 days ago",
      imageUrl: "/xiaomi-scooter.png", // will fallback cleanly or display SVG outline
      svgIcon: (
        <svg className="mx-auto h-20 w-20 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="18" r="3" />
          <path d="M6 15h11a1 1 0 001-1V5a1 1 0 00-1-1H9" />
        </svg>
      ),
    },
    {
      id: "sony-wh1000xm5",
      name: "Sony WH-1000XM5 Headphones",
      type: "User Guide",
      added: "Added 3 days ago",
      imageUrl: "/sony-headphones.png",
      svgIcon: (
        <svg className="mx-auto h-20 w-20 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9M3 14v3a2 2 0 002 2h2v-6H5a2 2 0 00-2 2zm16-1v6h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2z" />
        </svg>
      ),
    },
    {
      id: "canon-eos-r50",
      name: "Canon EOS R50 Camera",
      type: "Reference Manual",
      added: "Added 5 days ago",
      imageUrl: "/canon-camera.png",
      svgIcon: (
        <svg className="mx-auto h-20 w-20 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      ),
    },
    {
      id: "dyson-v15",
      name: "Dyson V15 Detect Vacuum",
      type: "User Manual",
      added: "Added 1 week ago",
      imageUrl: "/dyson-vacuum.png",
      svgIcon: (
        <svg className="mx-auto h-20 w-20 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path d="M19 11V5a2 2 0 00-2-2H7a2 2 0 00-2 2v6m14 0a4 4 0 01-4 4H9a4 4 0 01-4-4m14 0v9a1 1 0 01-1 1h-2a1 1 0 01-1-1v-5a1 1 0 00-1-1H9a1 1 0 00-1 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <section className="grid grid-cols-1 items-center gap-12 md:grid-cols-12 md:py-12 lg:gap-16">
        <div className="md:col-span-7 flex flex-col justify-center">
          <h1 className="font-display text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 sm:text-5xl lg:text-6xl">
            AI-Powered Support for Every Product You Own
          </h1>
          <p className="mt-6 text-lg text-slate-600 dark:text-slate-400 max-w-lg leading-relaxed">
            Get instant, accurate answers to any product issue. Upload manuals,
            ask questions, and let Mantis guide you.
          </p>
          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/diagnostics"
              className="flex h-12 items-center justify-center rounded-lg bg-mantis-green px-6 font-semibold text-white shadow-sm hover:bg-mantis-green-dark transition-colors"
            >
              Ask a Question
            </Link>
            <Link
              href="/products"
              className="flex h-12 items-center justify-center rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 font-semibold text-slate-700 dark:text-slate-300 shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        </div>
        
        {/* Hero Image Collage */}
        <div className="md:col-span-5 flex justify-center">
          <div className="relative w-full max-w-md aspect-square rounded-2xl bg-white dark:bg-slate-900 p-4 shadow-md dark:shadow-slate-950/40 flex items-center justify-center border border-slate-100 dark:border-slate-800">
            <img
              src="/hero-products.png?v=2"
              alt="Mantis products support collage"
              className="object-contain w-full h-full"
              onError={(e) => {
                // If image fails to load, show a fallback grid of icons
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.fallback-collage');
                  if (fallback) fallback.classList.remove('hidden');
                }
              }}
            />
            {/* SVG Fallback if image not ready */}
            <div className="fallback-collage hidden w-full h-full flex-col justify-center items-center gap-6">
              <div className="flex gap-6">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-mantis-green">
                  <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="6" cy="18" r="3" /><circle cx="18" cy="18" r="3" />
                    <path d="M6 15h11a1 1 0 001-1V5a1 1 0 00-1-1H9" />
                  </svg>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-mantis-green">
                  <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9M3 14v3a2 2 0 002 2h2v-6H5a2 2 0 00-2 2z" />
                  </svg>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-mantis-green">
                <svg className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="12" cy="12" r="4" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Categories */}
      <section className="mt-20">
        <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">Popular Categories</h2>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              href={`/products?category=${encodeURIComponent(cat.name)}`}
              className="flex flex-col items-center rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 text-center hover:shadow-md dark:hover:shadow-slate-950/50 hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
            >
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-50 dark:bg-green-950/40 group-hover:scale-105 transition-transform">
                {cat.icon}
              </div>
              <h3 className="mt-4 font-semibold text-slate-800 dark:text-slate-200 text-sm group-hover:text-mantis-green transition-colors">
                {cat.name}
              </h3>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{cat.count}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* How Mantis Helps You */}
      <section className="mt-24 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 sm:p-12 shadow-sm dark:shadow-slate-950/40">
        <div className="text-center max-w-xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-slate-900 dark:text-slate-50">How Mantis Helps You</h2>
          <p className="mt-3 text-slate-500 dark:text-slate-400">
            Four simple steps to troubleshoot, repair, and maintain your equipment.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, idx) => (
            <div key={idx} className="relative flex flex-col items-start p-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-50 dark:bg-green-950/40">
                {step.icon}
              </div>
              <h3 className="mt-6 font-semibold text-slate-800 dark:text-slate-200 text-base">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recently Added Manuals */}
      <section className="mt-24">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">Recently Added Manuals</h2>
          <Link
            href="/products"
            className="text-sm font-semibold text-mantis-green hover:text-mantis-green-dark transition-colors"
          >
            View All Manuals →
          </Link>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {recentManuals.map((man) => (
            <Link
              key={man.id}
              href={`/products/${man.id}`}
              className="flex flex-col rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-md dark:hover:shadow-slate-950/50 hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
            >
              <div className="flex aspect-square w-full items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-950 p-4 mb-4">
                {man.svgIcon}
              </div>
              <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm leading-snug group-hover:text-mantis-green transition-colors line-clamp-2">
                {man.name}
              </h3>
              <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 font-medium">{man.type}</p>
              <p className="mt-1 text-[11px] text-slate-400 dark:text-slate-500">{man.added}</p>
            </Link>
          ))}
          
          {/* View All Card */}
          <Link
            href="/products"
            className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 hover:border-mantis-green dark:hover:border-mantis-green bg-white dark:bg-slate-900 p-5 hover:shadow-md dark:hover:shadow-slate-950/50 transition-all group text-center cursor-pointer min-h-[260px]"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950 group-hover:bg-green-50 dark:group-hover:bg-green-950/40 transition-colors">
              <svg className="h-6 w-6 text-slate-400 dark:text-slate-500 group-hover:text-mantis-green transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </div>
            <h3 className="mt-4 font-semibold text-slate-700 dark:text-slate-200 text-sm group-hover:text-mantis-green transition-colors">
              View All Manuals
            </h3>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Browse all uploaded manuals</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
