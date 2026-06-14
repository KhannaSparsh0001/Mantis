"use client";

import { useState, useRef } from "react";


interface SidebarItem {
  name: string;
  icon: React.ReactNode;
}

interface UploadedManual {
  name: string;
  date: string;
  status: "Processed" | "Processing" | "Failed";
}

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("My Manuals");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [productId, setProductId] = useState("xiaomi-scooter-4-pro");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [manualList, setManualList] = useState<UploadedManual[]>([
    { name: "Ninebot MAX G2 Manual.pdf", date: "Uploaded May 15, 2024", status: "Processed" },
    { name: "Sony WH-1000XM5 Guide.pdf", date: "Uploaded May 14, 2024", status: "Processed" },
    { name: "Dyson V15 Manual.pdf", date: "Uploaded May 13, 2024", status: "Processed" },
  ]);

  const sidebarItems: SidebarItem[] = [
    {
      name: "My Manuals",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      name: "My Products",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
    },
    {
      name: "Conversations",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      ),
    },
    {
      name: "Profile",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
    },
    {
      name: "Settings",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];

  const handleCardClick = () => {
    if (!uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setUploadStatus("⚠️ Error: Only PDF manuals are supported.");
      return;
    }

    setUploading(true);
    setUploadStatus("⏳ Uploading & indexing via MOSS...");

    const formData = new FormData();
    formData.append("productId", productId);
    formData.append("file", selectedFile);

    try {
      const response = await fetch("http://localhost:8000/api/upload-manual", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Upload failed");
      }

      setUploadStatus(`✅ Successfully uploaded and indexed in MOSS!`);
      
      // Add newly uploaded manual to UI listing
      setManualList((prev) => [
        {
          name: selectedFile.name,
          date: `Uploaded ${new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}`,
          status: "Processed",
        },
        ...prev,
      ]);
    } catch (err) {
      console.error("Upload error:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      setUploadStatus(`❌ Failed: ${errMsg}`);
    } finally {
      setUploading(false);
      // Reset the file input value
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-slate-200/60 dark:border-slate-800 pb-5">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">Company Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage product resources, upload instruction manuals, and monitor user tickets.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12 items-start">
        {/* Left Panel: Sidebar Options */}
        <aside className="md:col-span-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex flex-col gap-1">
            {sidebarItems.map((item) => {
              const isActive = activeTab === item.name;
              return (
                <button
                  key={item.name}
                  onClick={() => setActiveTab(item.name)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 text-left text-xs font-semibold transition-all cursor-pointer ${
                    isActive
                      ? "bg-mantis-green-light dark:bg-green-950/20 border border-mantis-green-border dark:border-green-900/50 text-green-800 dark:text-green-300"
                      : "bg-white dark:bg-slate-900 border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <span className={isActive ? "text-mantis-green" : "text-slate-400 dark:text-slate-500"}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center Panel: File Upload Drag-and-Drop Area */}
        <section className="md:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-200 text-lg border-b border-slate-100 dark:border-slate-800 pb-4">
            {activeTab}
          </h2>

          {activeTab === "My Manuals" ? (
            <div className="mt-6 space-y-6">
              {/* Product Select Field */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Target Product</label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
                  disabled={uploading}
                >
                  <option value="xiaomi-scooter-4-pro">Xiaomi Mi Electric Scooter 4 Pro</option>
                  <option value="sony-wh1000xm5">Sony WH-1000XM5 Headphones</option>
                  <option value="canon-eos-r50">Canon EOS R50 Camera</option>
                  <option value="dyson-v15">Dyson V15 Detect Vacuum</option>
                </select>
              </div>

              {/* Drag and drop card */}
              <div
                onClick={handleCardClick}
                className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-all ${
                  uploading
                    ? "border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 cursor-not-allowed"
                    : "border-slate-200 dark:border-slate-800 hover:border-mantis-green bg-slate-50/50 dark:bg-slate-950/20"
                }`}
              >
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  disabled={uploading}
                />

                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-500 mb-4 animate-pulse">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                
                <h3 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">Upload a Manual</h3>
                <p className="mt-1 text-xs text-slate-400 dark:text-slate-500 max-w-xs leading-relaxed font-sans">
                  Click to select or drag and drop your PDF manual file here.
                  Supports files up to 50MB.
                </p>

                <button
                  disabled={uploading}
                  className="mt-6 rounded-lg bg-mantis-green px-5 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Choose File
                </button>
              </div>

              {/* Upload Status Alert */}
              {uploadStatus && (
                <div className={`rounded-xl px-4 py-3 text-xs font-semibold border ${
                  uploadStatus.startsWith("⚠️") || uploadStatus.startsWith("❌")
                    ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300"
                    : uploadStatus.startsWith("✅")
                    ? "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30 text-green-800 dark:text-green-300"
                    : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-400 animate-pulse"
                }`}>
                  {uploadStatus}
                </div>
              )}
            </div>
          ) : (
            <div className="mt-8 text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2" />
              </svg>
              <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">Settings Section</h3>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Configure parameters for {activeTab}.</p>
            </div>
          )}
        </section>

        {/* Right Panel: Processed Manuals List */}
        <aside className="md:col-span-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-100 dark:border-slate-800 pb-3">
            Recent Manuals
          </h3>

          <div className="mt-4 flex flex-col gap-3">
            {manualList.map((man, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 hover:border-slate-200 dark:hover:border-slate-800 transition-all"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate leading-tight flex-1">
                    {man.name}
                  </h4>
                  <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950/40 px-1.5 py-0.5 text-[9px] font-bold text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-600/10 dark:ring-green-900/30">
                    {man.status}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                  <span>{man.date}</span>
                  <button className="text-mantis-green hover:underline cursor-pointer">View</button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
            <button className="text-xs font-bold text-mantis-green hover:underline cursor-pointer">
              View All Manuals →
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
