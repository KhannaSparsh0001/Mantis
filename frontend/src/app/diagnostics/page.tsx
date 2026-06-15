"use client";

import { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import DiagnosticAssistant from "@/components/DiagnosticAssistant";
import { useAuth } from "@/contexts/AuthContext";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  product_id?: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin} min ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  return new Date(dateStr).toLocaleDateString();
}

function DiagnosticsContent() {
  const searchParams = useSearchParams();
  const initialProduct = searchParams.get("product") || "";
  const initialQuery = searchParams.get("query") || "";

  const { getAccessToken } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [suggestedActions, setSuggestedActions] = useState<string[]>([]);
  const [manualLinks, setManualLinks] = useState<{ name: string; page: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const autoCreatedRef = useRef<string | null>(null);

  const fetchConversations = useCallback(async () => {
    try {
      setIsLoading(true);
      setFetchError(null);
      const token = await getAccessToken();
      if (!token) {
        setIsLoading(false);
        return;
      }
      const res = await fetch(`${API_BASE}/api/conversations`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        if (res.status === 401) {
          setFetchError("Session expired. Please refresh.");
          return;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setConversations(data || []);
      if (data?.length > 0 && !activeConvId) {
        setActiveConvId(data[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch conversations:", err);
      setFetchError("Failed to load conversations");
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, activeConvId]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  useEffect(() => {
    if (!initialProduct) return;
    if (isLoading) return;
    if (autoCreatedRef.current === initialProduct) return;
    const hasExisting = conversations.some(c => c.product_id === initialProduct);
    if (hasExisting) {
      autoCreatedRef.current = initialProduct;
      return;
    }
    autoCreatedRef.current = initialProduct;
    (async () => {
      try {
        setIsCreating(true);
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/conversations`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ productId: initialProduct }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const nameRes = await fetch(`${API_BASE}/api/products`);
        if (nameRes.ok) {
          const all: any[] = await nameRes.json();
          const match = all.find((p: any) => p.id === initialProduct);
          if (match) {
            const title = `Diagnosing: ${match.title || match.id}`;
            await fetch(`${API_BASE}/api/conversations/${data.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ title }),
            });
            data.title = title;
          }
        }
        setConversations((prev) => [data, ...prev]);
        setActiveConvId(data.id);
      } catch {} finally {
        setIsCreating(false);
      }
    })();
  }, [initialProduct, isLoading, conversations, getAccessToken]);

  const handleCreateConversation = async () => {
    if (isCreating) return;
    try {
      setIsCreating(true);
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(initialProduct ? { productId: initialProduct } : {}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setConversations((prev) => [data, ...prev]);
      setActiveConvId(data.id);
    } catch (err) {
      console.error("Failed to create conversation:", err);
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch(`${API_BASE}/api/conversations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok && res.status !== 204) throw new Error(`HTTP ${res.status}`);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConvId === id) {
        setActiveConvId((prev) =>
          prev === id ? (conversations.length > 1 ? conversations.find((c) => c.id !== id)?.id || null : null) : prev
        );
      }
      setDeleteConfirmId(null);
    } catch (err) {
      console.error("Failed to delete conversation:", err);
    }
  };

  const handleFirstMessage = useCallback(
    async (text: string) => {
      if (!activeConvId) return;
      const title = text.trim().slice(0, 60);
      if (!title) return;
      try {
        const token = await getAccessToken();
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/conversations/${activeConvId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const updated = await res.json();
        setConversations((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, title: updated.title, updated_at: updated.updated_at } : c))
        );
      } catch (err) {
        console.error("Failed to update conversation title:", err);
      }
    },
    [activeConvId, getAccessToken]
  );

  const activeConversation = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Page Header */}
      <div className="border-b border-slate-200/60 dark:border-slate-800 pb-5">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">Diagnostics Assistant</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Troubleshoot faults with verified manufacturer-provided manuals and guides.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12 items-start">
        {/* Left Panel: Conversation Lists */}
        <aside className="md:col-span-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm">Conversations</span>
            <button
              onClick={handleCreateConversation}
              disabled={isCreating}
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 hover:bg-green-50 dark:hover:bg-green-950/40 hover:text-mantis-green dark:hover:text-mantis-green transition-all shadow-sm border border-slate-100 dark:border-slate-800 disabled:opacity-40"
            >
              <svg className={`h-4 w-4 ${isCreating ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            {isLoading ? (
              <div className="flex flex-col gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse rounded-xl bg-slate-100 dark:bg-slate-800 h-14" />
                ))}
              </div>
            ) : fetchError ? (
              <p className="text-xs text-red-500 dark:text-red-400 text-center py-4">{fetchError}</p>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8">
                <svg className="h-8 w-8 mx-auto text-slate-300 dark:text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conv) => {
                const isActive = activeConvId === conv.id;
                return (
                  <div key={conv.id} className="relative group">
                    <button
                      onClick={() => setActiveConvId(conv.id)}
                      className={`w-full flex flex-col items-start rounded-xl px-4 py-3 text-left transition-all cursor-pointer ${
                        isActive
                          ? "bg-mantis-green-light dark:bg-green-950/20 border border-mantis-green-border dark:border-green-900/50 text-green-800 dark:text-green-300"
                          : "bg-white dark:bg-slate-900 border border-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      }`}
                    >
                      <span className={`font-semibold text-xs leading-none ${isActive ? "text-green-700 dark:text-green-400" : "text-slate-800 dark:text-slate-200"}`}>
                        {conv.title}
                      </span>
                      <span className="mt-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-medium">{getRelativeTime(conv.created_at)}</span>
                    </button>
                    {deleteConfirmId === conv.id ? (
                      <div className="absolute right-1 top-1 flex items-center gap-1 bg-white dark:bg-slate-800 rounded-lg border border-red-200 dark:border-red-900/50 px-2 py-1 shadow-sm z-10">
                        <span className="text-[10px] font-semibold text-red-500">Delete?</span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteConversation(conv.id); }}
                          className="text-[10px] font-bold text-red-600 hover:text-red-800 px-1"
                        >
                          Yes
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                          className="text-[10px] font-bold text-slate-500 hover:text-slate-700 px-1"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(conv.id); }}
                        className="absolute right-2 top-2 hidden group-hover:flex h-5 w-5 items-center justify-center rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 hover:text-red-500 hover:border-red-300 transition-all shadow-sm"
                      >
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* Center Panel: Active Chat Window */}
        <section className="md:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
          {/* Active Chat Header */}
          <div className="bg-slate-50 dark:bg-slate-950 border-b border-slate-200/80 dark:border-slate-800 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm">
                {activeConversation?.title || "Active Diagnostics"}
              </h2>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium mt-0.5">Active Technician Session</p>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>

          {activeConvId ? (
            <DiagnosticAssistant
              key={activeConvId}
              productId={activeConversation?.product_id || initialProduct}
              initialQuery={initialQuery}
              onSuggestedActionsChange={setSuggestedActions}
              onManualLinksChange={setManualLinks}
              onFirstMessage={handleFirstMessage}
            />
          ) : (
            <div className="flex min-h-[350px] items-center justify-center text-sm text-slate-400 dark:text-slate-500 font-medium">
              Select or create a conversation to start
            </div>
          )}
        </section>

        {/* Right Panel: Manual Citations & Actions */}
        <aside className="md:col-span-3 flex flex-col gap-6">
          {/* From Manual Citations */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-100 dark:border-slate-800 pb-3">From Manual</h3>
            {manualLinks.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {manualLinks.map((link, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-green-50/50 dark:hover:bg-green-950/20 hover:border-mantis-green-border dark:hover:border-mantis-green-border cursor-pointer transition-colors"
                  >
                    <span className="truncate max-w-[150px]">{link.name}</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-1.5 py-0.5 rounded">
                      Page {link.page}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center py-4">Send a message to see manual references</p>
            )}
          </div>

          {/* Suggested Actions Checklist */}
          <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
            <h3 className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-100 dark:border-slate-800 pb-3">Suggested Actions</h3>
            {suggestedActions.length > 0 ? (
              <div className="mt-4 flex flex-col gap-3">
                {suggestedActions.map((action, idx) => (
                  <label
                    key={idx}
                    className="flex items-start gap-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 p-3 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-950 cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      className="mt-0.5 h-3.5 w-3.5 rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-mantis-green focus:ring-mantis-green"
                    />
                    <span>{action}</span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-xs text-slate-400 dark:text-slate-500 text-center py-4">Send a message to get action suggestions</p>
            )}

            {initialProduct && (
              <div className="mt-6 border-t border-slate-100 dark:border-slate-800 pt-4 text-center">
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
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function DiagnosticsPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[400px] items-center justify-center text-sm font-semibold text-slate-400">
        Loading Diagnostics Assistant...
      </div>
    }>
      <DiagnosticsContent />
    </Suspense>
  );
}
