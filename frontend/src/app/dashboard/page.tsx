"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarItem {
  name: string;
  icon: React.ReactNode;
}

interface UploadedManual {
  id?: string;
  title?: string;
  description?: string;
  tags?: string[];
  name?: string;
  date?: string;
  status?: string;
  created_at?: string;
}

interface CompanyInfo {
  id: string;
  name: string;
  slug: string;
  role: string;
  memberCount?: number;
}

interface CompanyMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export default function DashboardPage() {
  const { user, isLoading: authLoading, role, getAccessToken, companies, isCompanyAdmin, refreshCompanies } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("My Manuals");
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [productId, setProductId] = useState("");
  const [uploadTitle, setUploadTitle] = useState("");
  const [dbProducts, setDbProducts] = useState<{ id: string; title?: string; description?: string; tags?: string[]; company_id?: string | null; created_at?: string }[]>([]);
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadTags, setUploadTags] = useState("");
  const [uploadImage, setUploadImage] = useState<File | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const [manualList, setManualList] = useState<UploadedManual[]>([]);
  const [companyDetails, setCompanyDetails] = useState<CompanyInfo[]>([]);
  const [companyMembers, setCompanyMembers] = useState<Record<string, CompanyMember[]>>({});
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteCompanyId, setInviteCompanyId] = useState<string | null>(null);
  const [removeStatus, setRemoveStatus] = useState<string | null>(null);
  const [addUserId, setAddUserId] = useState("");
  const [addUserRole, setAddUserRole] = useState("member");
  const [addUserStatus, setAddUserStatus] = useState<string | null>(null);
  const [addUserCompanyId, setAddUserCompanyId] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editTags, setEditTags] = useState("");
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [additionalImages, setAdditionalImages] = useState<File[]>([]);
  const [videos, setVideos] = useState<File[]>([]);
  const [links, setLinks] = useState<{ url: string; title: string }[]>([]);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const fetchManuals = async () => {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;
      const response = await fetch("http://localhost:8000/api/manuals", { headers });
      if (response.ok) {
        const data = await response.json();
        setManualList(data);
      }
    } catch (err) {
      console.error("Failed to fetch manuals:", err);
    }
  };

  const fetchDbProducts = async () => {
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

  const fetchCompanyDetails = useCallback(async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch("http://localhost:8000/api/companies/mine", { headers });
      if (res.ok) {
        const data = await res.json();
        setCompanyDetails(data);

        const memberPromises = data.map(async (c: CompanyInfo) => {
          const mRes = await fetch(`http://localhost:8000/api/companies/${c.id}/members`, { headers });
          if (mRes.ok) {
            const members = await mRes.json();
            return { id: c.id, members };
          }
          return { id: c.id, members: [] };
        });

        const results = await Promise.all(memberPromises);
        const memberMap: Record<string, CompanyMember[]> = {};
        results.forEach(r => { memberMap[r.id] = r.members; });
        setCompanyMembers(memberMap);
      }
    } catch (err) {
      console.error("Failed to fetch company details:", err);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
      return;
    }
    requestAnimationFrame(() => {
      fetchManuals();
      fetchDbProducts();
    });
  }, [authLoading, user]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchCompanyDetails();
    }
  }, [authLoading, user, fetchCompanyDetails, companies]);

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
      name: "Companies",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
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
  ];

  const handleInvite = async (companyId: string) => {
    if (!inviteEmail.trim()) return;
    setInviteStatus("Sending...");
    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/companies/${companyId}/invitations`, {
        method: "POST",
        headers,
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        setInviteStatus("Invitation sent.");
        setInviteEmail("");
        setInviteCompanyId(null);
      } else {
        const err = await res.json();
        setInviteStatus(err.error || "Failed to send invitation.");
      }
    } catch {
      setInviteStatus("Network error.");
    }
  };

  const handleAddUser = async (companyId: string) => {
    if (!addUserId.trim()) return;
    setAddUserStatus("Adding...");
    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/companies/${companyId}/members`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: addUserId.trim(), role: addUserRole }),
      });
      if (res.ok) {
        setAddUserStatus("Member added.");
        setAddUserId("");
        setAddUserCompanyId(null);
        await fetchCompanyDetails();
      } else {
        const err = await res.json();
        setAddUserStatus(err.error || "Failed to add member.");
      }
    } catch {
      setAddUserStatus("Network error.");
    }
  };

  const handleRemoveMember = async (companyId: string, userId: string) => {
    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/companies/${companyId}/members/${userId}`, {
        method: "DELETE",
        headers,
      });
      if (res.ok) {
        setRemoveStatus("Member removed.");
        await fetchCompanyDetails();
      } else {
        const err = await res.json();
        setRemoveStatus(err.error || "Failed to remove member.");
      }
    } catch {
      setRemoveStatus("Network error.");
    }
  };

  const handleDeleteProductFromDashboard = async (productId: string) => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/products/${productId}`, {
        method: "DELETE",
        headers,
      });
      if (!res.ok) {
        const err = await res.json();
        setDeleteError(err.error || "Failed to delete product");
        return;
      }
      setDeletingProductId(null);
      setDeleteError(null);
      fetchDbProducts();
      fetchManuals();
    } catch {
      setDeleteError("Network error while deleting product");
    }
  };

  const handleEditProduct = async (productId: string) => {
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
        setEditingProductId(null);
        fetchDbProducts();
      } else {
        const err = await res.json();
        console.error("Edit failed:", err.error);
      }
    } catch {}
  };

  const canEdit = (product: { company_id?: string | null }): boolean => {
    if (role === "admin") return true;
    if (!product.company_id) return false;
    return companies.some(c => c.id === product.company_id);
  };

  const canUpload = role === "admin" || companies.length > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200/60 dark:border-slate-800 pb-5">
        <h1 className="font-display text-2xl font-bold text-slate-900 dark:text-slate-50">Company Dashboard</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Manage product resources, upload instruction manuals, and monitor user tickets.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-12 items-start">
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

          <div className="border-t border-slate-100 dark:border-slate-800 mt-4 pt-4">
            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1">Your User ID</p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate rounded-lg bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-[10px] font-mono text-slate-600 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                {user?.id}
              </code>
              <button
                onClick={() => navigator.clipboard.writeText(user?.id || "")}
                className="shrink-0 rounded-lg border border-slate-200/80 dark:border-slate-800 px-2 py-1.5 text-[10px] font-semibold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 transition-colors cursor-pointer"
                title="Copy user ID"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        <section className="md:col-span-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 md:p-8 shadow-sm">
          <h2 className="font-display font-bold text-slate-800 dark:text-slate-200 text-lg border-b border-slate-100 dark:border-slate-800 pb-4">
            {activeTab}
          </h2>

          {activeTab === "My Manuals" ? (
            canUpload ? (
              <div className="mt-6 space-y-6">
                {/* Product ID */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product ID <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={productId}
                    onChange={(e) => {
                      setProductId(e.target.value);
                      if (!uploadTitle) setUploadTitle(e.target.value.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "));
                    }}
                    placeholder="product-slug-id"
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white font-mono"
                    disabled={uploading}
                  />
                </div>

                {/* Product Title */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder="e.g. Xiaomi Mi Electric Scooter 4 Pro"
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
                    disabled={uploading}
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Description <span className="text-red-500">*</span></label>
                  <textarea
                    value={uploadDescription}
                    onChange={(e) => setUploadDescription(e.target.value)}
                    placeholder="Brief product description..."
                    rows={2}
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white resize-none"
                    disabled={uploading}
                  />
                </div>

                {/* Tags */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Tags <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    value={uploadTags}
                    onChange={(e) => setUploadTags(e.target.value)}
                    placeholder="e.g. scooter, electric, troubleshooting"
                    className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
                    disabled={uploading}
                  />
                </div>

                {/* Product Image (single) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Product Image (optional)</label>
                  <div
                    onClick={() => imageInputRef.current?.click()}
                    className="flex items-center gap-4 rounded-2xl border-2 border-dashed p-4 cursor-pointer transition-all border-slate-200 dark:border-slate-800 hover:border-mantis-green bg-slate-50/50 dark:bg-slate-950/20"
                  >
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      ref={imageInputRef}
                      onChange={(e) => setUploadImage(e.target.files?.[0] || null)}
                      disabled={uploading}
                    />
                    {uploadImage ? (
                      <>
                        <div className="h-16 w-16 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                          <img
                            src={URL.createObjectURL(uploadImage)}
                            alt={uploadImage.name}
                            className="h-full w-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">{uploadImage.name}</p>
                          <p className="text-[10px] text-slate-400">Click to change</p>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); setUploadImage(null); }}
                          className="shrink-0 rounded-full bg-red-100 dark:bg-red-950/40 text-red-500 hover:text-red-700 hover:bg-red-200 w-6 h-6 flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
                          title="Remove"
                        >
                          &times;
                        </button>
                      </>
                    ) : (
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-950 text-slate-400 shrink-0">
                          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                          </svg>
                        </div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Click to select product image</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* PDF Manual (required) */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300">PDF Manual <span className="text-red-500">*</span></label>
                  <div
                    onClick={() => pdfInputRef.current?.click()}
                    className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer transition-all border-slate-200 dark:border-slate-800 hover:border-mantis-green bg-slate-50/50 dark:bg-slate-950/20"
                  >
                    <input
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      ref={pdfInputRef}
                      onChange={(e) => setPdfFile(e.target.files?.[0] || null)}
                      disabled={uploading}
                    />
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-950 text-slate-400 mb-3">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>
                    <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                      {pdfFile ? pdfFile.name : 'Click to select PDF manual'}
                    </p>
                  </div>
                </div>

                {/* Additional Images (optional, multiple) */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Additional Images (optional) <span className="text-slate-400 font-normal">{additionalImages.length > 0 ? `(${additionalImages.length})` : ''}</span></p>
                  {additionalImages.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">No images selected.</p>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-mantis-green file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-mantis-green-dark cursor-pointer"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        setAdditionalImages(prev => [...prev, ...Array.from(files)]);
                      }
                    }}
                    disabled={uploading}
                  />
                  {additionalImages.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {additionalImages.map((f, i) => (
                        <div key={i} className="group relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950">
                          <div className="aspect-square overflow-hidden">
                            <img src={URL.createObjectURL(f)} alt={f.name} className="h-full w-full object-cover" />
                          </div>
                          <div className="p-2 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate flex-1">{f.name}</span>
                            <button onClick={() => setAdditionalImages(prev => prev.filter((_, j) => j !== i))}
                              className="shrink-0 ml-1 rounded-full bg-red-100 dark:bg-red-950/40 text-red-500 hover:text-red-700 w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer">&times;</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Videos (optional, multiple) */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-3">Videos (optional) <span className="text-slate-400 font-normal">{videos.length > 0 ? `(${videos.length})` : ''}</span></p>
                  {videos.length === 0 && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">No videos selected.</p>
                  )}
                  <input
                    type="file"
                    accept="video/*"
                    multiple
                    className="text-xs text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-mantis-green file:px-4 file:py-2 file:text-xs file:font-semibold file:text-white hover:file:bg-mantis-green-dark cursor-pointer"
                    onChange={(e) => {
                      const files = e.target.files;
                      if (files && files.length > 0) {
                        setVideos(prev => [...prev, ...Array.from(files)]);
                      }
                    }}
                    disabled={uploading}
                  />
                  {videos.length > 0 && (
                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {videos.map((f, i) => (
                        <div key={i} className="group relative rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50 dark:bg-slate-950">
                          <div className="aspect-video overflow-hidden flex items-center justify-center bg-black/5 dark:bg-white/5">
                            <video src={URL.createObjectURL(f)} className="h-full w-full object-cover" controls />
                          </div>
                          <div className="p-2 flex items-center justify-between">
                            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 truncate flex-1">{f.name}</span>
                            <button onClick={() => setVideos(prev => prev.filter((_, j) => j !== i))}
                              className="shrink-0 ml-1 rounded-full bg-red-100 dark:bg-red-950/40 text-red-500 hover:text-red-700 w-5 h-5 flex items-center justify-center text-xs font-bold cursor-pointer">&times;</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* External Links (optional, multiple) */}
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">External Links (optional)</label>
                    <button
                      type="button"
                      onClick={() => setLinks(prev => [...prev, { url: '', title: '' }])}
                      className="rounded-lg border border-slate-200/80 dark:border-slate-800 px-2 py-1 text-[10px] font-semibold text-slate-500 hover:border-slate-300 transition-colors cursor-pointer"
                      disabled={uploading}
                    >
                      Add Link
                    </button>
                  </div>
                  {links.map((link, i) => (
                    <div key={i} className="flex gap-2 mb-2">
                      <input
                        type="url"
                        value={link.url}
                        onChange={(e) => {
                          const updated = [...links];
                          updated[i] = { ...updated[i], url: e.target.value };
                          setLinks(updated);
                        }}
                        placeholder="https://example.com/guide"
                        className="flex-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
                        disabled={uploading}
                      />
                      <input
                        type="text"
                        value={link.title}
                        onChange={(e) => {
                          const updated = [...links];
                          updated[i] = { ...updated[i], title: e.target.value };
                          setLinks(updated);
                        }}
                        placeholder="Title"
                        className="w-40 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
                        disabled={uploading}
                      />
                      <button
                        onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))}
                        className="text-red-400 hover:text-red-600 text-lg cursor-pointer px-1"
                        disabled={uploading}
                      >
                        &times;
                      </button>
                    </div>
                  ))}
                </div>

                {/* Submit */}
                <button
                  onClick={async () => {
                    if (!productId.trim() || !uploadTitle.trim() || !uploadDescription.trim() || !uploadTags.trim() || !pdfFile) {
                      setUploadStatus("Please fill in all required fields (ID, title, description, tags, and PDF).");
                      return;
                    }
                    setUploading(true);
                    setUploadStatus("Creating product...");
                    try {
                      const token = await getAccessToken();
                      const headers: Record<string, string> = { "Content-Type": "application/json" };
                      if (token) headers["Authorization"] = `Bearer ${token}`;

                      // 1. Create product
                      const createRes = await fetch("http://localhost:8000/api/products", {
                        method: "POST",
                        headers,
                        body: JSON.stringify({
                          id: productId.trim(),
                          title: uploadTitle.trim(),
                          description: uploadDescription.trim(),
                          tags: uploadTags.split(",").map(t => t.trim()),
                        }),
                      });
                      if (!createRes.ok) {
                        const err = await createRes.json();
                        throw new Error(err.error || "Failed to create product");
                      }
                      setUploadStatus("Product created. Uploading manual...");

                      // 2. Upload PDF + MOSS index
                      const pdfFormData = new FormData();
                      pdfFormData.append("productId", productId.trim());
                      pdfFormData.append("title", uploadTitle.trim());
                      pdfFormData.append("description", uploadDescription.trim());
                      pdfFormData.append("tags", uploadTags);
                      pdfFormData.append("file", pdfFile);
                      if (uploadImage) pdfFormData.append("image", uploadImage);
                      const pdfHeaders: Record<string, string> = {};
                      if (token) pdfHeaders["Authorization"] = `Bearer ${token}`;
                      const pdfRes = await fetch("http://localhost:8000/api/upload-manual", {
                        method: "POST",
                        headers: pdfHeaders,
                        body: pdfFormData,
                      });
                      if (!pdfRes.ok) {
                        const err = await pdfRes.json();
                        throw new Error(err.error || "Manual upload failed");
                      }

                      // 3. Upload additional images
                      for (const img of additionalImages) {
                        const imgFormData = new FormData();
                        imgFormData.append("type", "image");
                        imgFormData.append("title", img.name);
                        imgFormData.append("file", img);
                        const imgHeaders: Record<string, string> = {};
                        if (token) imgHeaders["Authorization"] = `Bearer ${token}`;
                        await fetch(`http://localhost:8000/api/products/${productId.trim()}/resources`, {
                          method: "POST",
                          headers: imgHeaders,
                          body: imgFormData,
                        });
                      }

                      // 4. Upload videos
                      for (const vid of videos) {
                        const vidFormData = new FormData();
                        vidFormData.append("type", "video");
                        vidFormData.append("title", vid.name);
                        vidFormData.append("file", vid);
                        const vidHeaders: Record<string, string> = {};
                        if (token) vidHeaders["Authorization"] = `Bearer ${token}`;
                        await fetch(`http://localhost:8000/api/products/${productId.trim()}/resources`, {
                          method: "POST",
                          headers: vidHeaders,
                          body: vidFormData,
                        });
                      }

                      // 5. Add links
                      for (const link of links) {
                        if (!link.url.trim()) continue;
                        const linkHeaders: Record<string, string> = { "Content-Type": "application/json" };
                        if (token) linkHeaders["Authorization"] = `Bearer ${token}`;
                        await fetch(`http://localhost:8000/api/products/${productId.trim()}/resources`, {
                          method: "POST",
                          headers: linkHeaders,
                          body: JSON.stringify({ type: "link", url: link.url.trim(), title: link.title.trim() || link.url.trim() }),
                        });
                      }

                      setUploadStatus("Successfully uploaded product, manual, and all resources!");
                      setPdfFile(null);
                      setAdditionalImages([]);
                      setVideos([]);
                      setLinks([]);
                      setUploadImage(null);
                      await fetchManuals();
                    } catch (err) {
                      const errMsg = err instanceof Error ? err.message : String(err);
                      setUploadStatus(`Failed: ${errMsg}`);
                    } finally {
                      setUploading(false);
                    }
                  }}
                  className="w-full rounded-lg bg-mantis-green py-3 text-sm font-bold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer disabled:opacity-50"
                  disabled={uploading}
                >
                  {uploading ? 'Processing...' : 'Create Product'}
                </button>

                {uploadStatus && (
                  <div className={`rounded-xl px-4 py-3 text-xs font-semibold border ${
                    uploadStatus.startsWith("Failed")
                      ? "bg-red-50 dark:bg-red-950/20 border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300"
                      : uploadStatus.startsWith("Successfully")
                      ? "bg-green-50 dark:bg-green-950/20 border-green-100 dark:border-green-900/30 text-green-800 dark:text-green-300"
                      : "bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-400"
                  }`}>
                    {uploadStatus}
                  </div>
                )}
              </div>
            ) : (
              <div className="mt-8 text-center py-12">
                <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m0 0v2m0-2h2m-2 0H10m9.364-7.364A9 9 0 1112 3a9 9 0 017.364 4.636z" />
                </svg>
                <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">Limited Access</h3>
                <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-relaxed">
                  You have view-only access. Contact an administrator or company account to upload manuals.
                </p>
              </div>
            )
          ) : activeTab === "Companies" ? (
            <div className="mt-6 space-y-6">
              {companyDetails.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">No Company Memberships</h3>
                  <p className="mt-2 text-xs text-slate-400 dark:text-slate-500 max-w-xs mx-auto leading-relaxed">
                    You are not a member of any company yet.
                  </p>
                  {role === "admin" && (
                    <a href="/admin/companies" className="mt-4 inline-block rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors">
                      Go to Admin Panel
                    </a>
                  )}
                </div>
              ) : (
                companyDetails.map((c) => {
                  const isAdmin = c.role === 'admin' || role === 'admin';
                  const members = companyMembers[c.id] || [];
                  return (
                    <div key={c.id} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-display font-bold text-slate-800 dark:text-slate-200">{c.name}</h3>
                          <p className="text-xs text-slate-400">{c.slug} - {c.memberCount || members.length} member(s)</p>
                        </div>
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          c.role === 'admin' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/10' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {c.role}
                        </span>
                      </div>

                      <div className="space-y-1.5 mb-4">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">Members</p>
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 px-3 py-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{m.user_id.substring(0, 8)}...</span>
                              <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-bold ${
                                m.role === 'admin' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'
                              }`}>{m.role}</span>
                            </div>
                            {isAdmin && m.user_id !== user?.id && (
                              <button
                                onClick={() => handleRemoveMember(c.id, m.user_id)}
                                className="text-[10px] text-red-500 hover:underline cursor-pointer font-semibold"
                              >
                                Remove
                              </button>
                            )}
                          </div>
                        ))}
                        {members.length === 0 && <p className="text-xs text-slate-400">No members.</p>}
                      </div>

                      {isAdmin && (
                        <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                          <div>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Invite by Email</p>
                            <div className="flex gap-2">
                              <input
                                type="email"
                                value={inviteCompanyId === c.id ? inviteEmail : ""}
                                onChange={(e) => { setInviteEmail(e.target.value); setInviteCompanyId(c.id); }}
                                onFocus={() => setInviteCompanyId(c.id)}
                                placeholder="email@example.com"
                                className="flex-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
                              />
                              <select
                                value={inviteCompanyId === c.id ? inviteRole : "member"}
                                onChange={(e) => setInviteRole(e.target.value)}
                                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => handleInvite(c.id)}
                                className="rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer"
                              >
                                Invite
                              </button>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">Add by User ID</p>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={addUserCompanyId === c.id ? addUserId : ""}
                                onChange={(e) => { setAddUserId(e.target.value); setAddUserCompanyId(c.id); }}
                                onFocus={() => setAddUserCompanyId(c.id)}
                                placeholder="User ID"
                                className="flex-1 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white font-mono"
                              />
                              <select
                                value={addUserCompanyId === c.id ? addUserRole : "member"}
                                onChange={(e) => setAddUserRole(e.target.value)}
                                className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-2 text-xs font-semibold outline-none focus:border-mantis-green dark:text-white"
                              >
                                <option value="member">Member</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                onClick={() => handleAddUser(c.id)}
                                className="rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
              {inviteStatus && (
                <div className="rounded-xl px-4 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-400">
                  {inviteStatus}
                </div>
              )}
              {addUserStatus && (
                <div className={`rounded-xl px-4 py-2 text-xs font-semibold border ${
                  addUserStatus.startsWith("Failed") || addUserStatus.startsWith("Network")
                    ? "bg-red-50 border-red-100 text-red-800"
                    : "bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-400"
                }`}>
                  {addUserStatus}
                </div>
              )}
              {removeStatus && (
                <div className="rounded-xl px-4 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-700 dark:text-slate-400">
                  {removeStatus}
                </div>
              )}
            </div>
          ) : activeTab === "My Products" ? (
            <div className="mt-6 space-y-4">
              {deletingProductId && (
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
                    {deleteError && (
                      <div className="mb-4 rounded-xl px-4 py-2 text-xs font-semibold bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-300">
                        {deleteError}
                      </div>
                    )}
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => { setDeletingProductId(null); setDeleteError(null); }}
                        className="rounded-lg border border-slate-200/80 dark:border-slate-800 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => handleDeleteProductFromDashboard(deletingProductId)}
                        className="rounded-lg bg-red-500 px-4 py-2 text-xs font-semibold text-white hover:bg-red-600 transition-colors cursor-pointer"
                      >
                        Delete Permanently
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {dbProducts.length === 0 ? (
                <div className="text-center py-12">
                  <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">No Products</h3>
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Upload a manual from the My Manuals tab to create your first product.</p>
                </div>
              ) : (
                dbProducts.map((p) => {
                  const editable = canEdit(p);
                  const isEditing = editingProductId === p.id;
                  return (
                    <div key={p.id} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm">
                      {isEditing ? (
                        <div className="space-y-3">
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
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleEditProduct(p.id)}
                              className="rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingProductId(null)}
                              className="rounded-lg border border-slate-200/80 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-display font-bold text-slate-800 dark:text-slate-200">{p.title || p.id}</h3>
                            {p.description && <p className="mt-1 text-xs text-slate-400">{p.description}</p>}
                            {p.tags && p.tags.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {p.tags.map((tag: string, i: number) => (
                                  <span key={i} className="rounded-full bg-slate-100 dark:bg-slate-950 px-2 py-0.5 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2 shrink-0">
                            {editable && (
                              <button
                                onClick={() => {
                                  setEditingProductId(p.id);
                                  setEditTitle(p.title || "");
                                  setEditDescription(p.description || "");
                                  setEditTags(p.tags?.join(", ") || "");
                                }}
                                className="rounded-lg border border-slate-200/80 dark:border-slate-800 px-3 py-2 text-[10px] font-semibold text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                            {editable && (
                              <button
                                onClick={() => { setDeletingProductId(p.id); setDeleteError(null); }}
                                className="rounded-lg border border-red-200 dark:border-red-900/30 px-3 py-2 text-[10px] font-semibold text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                              >
                                Delete
                              </button>
                            )}
                            <Link
                              href={`/diagnostics?product=${p.id}`}
                              className="rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors"
                            >
                              Diagnose
                            </Link>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="mt-8 text-center py-12">
              <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2" />
              </svg>
              <h3 className="mt-4 text-sm font-bold text-slate-700 dark:text-slate-300">Section Coming Soon</h3>
              <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">Configure parameters for {activeTab}.</p>
            </div>
          )}
        </section>

        <aside className="md:col-span-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
          <h3 className="font-display font-bold text-slate-800 dark:text-slate-200 text-sm border-b border-slate-100 dark:border-slate-800 pb-3">
            Recent Manuals
          </h3>

          <div className="mt-4 flex flex-col gap-3">
            {manualList.map((man, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 hover:border-slate-200 dark:hover:border-slate-800 transition-all p-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-[11px] truncate leading-tight flex-1">
                    {man.title || man.name || 'Untitled'}
                  </h4>
                  <span className="inline-flex items-center rounded-full bg-green-50 dark:bg-green-950/40 px-1.5 py-0.5 text-[9px] font-bold text-green-700 dark:text-green-300 ring-1 ring-inset ring-green-600/10 dark:ring-green-900/30">
                    {man.status || 'Processed'}
                  </span>
                </div>
                {man.description && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 line-clamp-2">{man.description}</p>
                )}
                {man.tags && man.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {man.tags.slice(0, 3).map((tag, i) => (
                      <span key={i} className="rounded-full bg-slate-100 dark:bg-slate-950 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500 dark:text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex items-center justify-between text-[9px] text-slate-400 dark:text-slate-500 font-semibold">
                  <span>{man.created_at ? new Date(man.created_at).toLocaleDateString() : man.date || ''}</span>
                  <button className="text-mantis-green hover:underline cursor-pointer">View</button>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
