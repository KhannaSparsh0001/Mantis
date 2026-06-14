"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DiagnosticAssistant from "@/components/DiagnosticAssistant";

interface Conversation {
  id: string;
  title: string;
  time: string;
}

export default function DiagnosticsPage() {
  const searchParams = useSearchParams();
  const initialProduct = searchParams.get("product") || "xiaomi-scooter-4-pro";
  const initialQuery = searchParams.get("query") || "";

  const [activeConvId, setActiveConvId] = useState("conv-1");
  const [suggestedActions, setSuggestedActions] = useState<string[]>([
    "Verify wall outlet works",
    "Inspect charging port connection",
    "Connect charger to battery",
  ]);
  const [manualLinks, setManualLinks] = useState<{ name: string; page: number }[]>([
    { name: "Charging the Battery", page: 18 },
    { name: "Troubleshooting Guide", page: 28 },
  ]);

  const conversations: Conversation[] = [
    { id: "conv-1", title: "Scooter won't start", time: "2 min ago" },
    { id: "conv-2", title: "Battery draining fast", time: "1 hour ago" },
    { id: "conv-3", title: "Error code E4 help", time: "Yesterday" },
    { id: "conv-4", title: "Brake adjustment", time: "2 days ago" },
    { id: "conv-5", title: "Lights not working", time: "3 days ago" },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-slate-200/60 pb-5">
        <h1 className="font-display text-2xl font-bold text-slate-900">Diagnostics Assistant</h1>
        <p className="mt-1 text-sm text-slate-500">
          Troubleshoot faults with verified manufacturer-provided manuals and guides.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12 items-start">
        {/* Left Panel: Conversation Lists */}
        <aside className="md:col-span-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <span className="font-display font-bold text-slate-800 text-sm">Conversations</span>
            <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 text-slate-500 hover:bg-green-50 hover:text-mantis-green transition-all shadow-sm border border-slate-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {conversations.map((conv) => {
              const isActive = activeConvId === conv.id;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`w-full flex flex-col items-start rounded-xl px-4 py-3 text-left transition-all ${
                    isActive
                      ? "bg-mantis-green-light border border-mantis-green-border text-green-800"
                      : "bg-white border border-transparent text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <span className={`font-semibold text-xs leading-none ${isActive ? "text-green-700" : "text-slate-800"}`}>
                    {conv.title}
                  </span>
                  <span className="mt-1.5 text-[10px] text-slate-400 font-medium">{conv.time}</span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Center Panel: Active Chat Window */}
        <section className="md:col-span-6 rounded-2xl border border-slate-200/80 bg-white shadow-sm overflow-hidden">
          {/* Active Chat Header */}
          <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-slate-800 text-sm">
                {conversations.find((c) => c.id === activeConvId)?.title || "Active Diagnostics"}
              </h2>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Active Technician Session</p>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>

          <DiagnosticAssistant
            productId={initialProduct}
            initialQuery={initialQuery}
            onSuggestedActionsChange={setSuggestedActions}
            onManualLinksChange={setManualLinks}
          />
        </section>

        {/* Right Panel: Manual Citations & Actions */}
        <aside className="md:col-span-3 flex flex-col gap-6">
          {/* From Manual Citations */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h3 className="font-display font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">From Manual</h3>
            <div className="mt-4 flex flex-col gap-3">
              {manualLinks.map((link, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-lg bg-slate-50 border border-slate-100 p-3 text-xs font-semibold text-slate-700 hover:bg-green-50/50 hover:border-mantis-green-border cursor-pointer transition-colors"
                >
                  <span className="truncate max-w-[150px]">{link.name}</span>
                  <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                    Page {link.page}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Actions Checklist */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <h3 className="font-display font-bold text-slate-800 text-sm border-b border-slate-100 pb-3">Suggested Actions</h3>
            <div className="mt-4 flex flex-col gap-3">
              {suggestedActions.map((action, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/50 p-3 text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 text-mantis-green focus:ring-mantis-green"
                  />
                  <span>{action}</span>
                </label>
              ))}
            </div>
            
            {/* View Full Manual Link */}
            <div className="mt-6 border-t border-slate-100 pt-4 text-center">
              <Link
                href={`/products/${initialProduct}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-mantis-green hover:text-mantis-green-dark transition-colors"
              >
                View Full Manual
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
