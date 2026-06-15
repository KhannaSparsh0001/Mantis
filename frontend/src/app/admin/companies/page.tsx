"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Company {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  member_count?: { count: number }[];
}

export default function AdminCompaniesPage() {
  const { user, isLoading, role, getAccessToken } = useAuth();
  const router = useRouter();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(50);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSlug, setCreateSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [createError, setCreateError] = useState("");

  const fetchCompanies = useCallback(async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;
    try {
      const res = await fetch(`http://localhost:8000/api/admin/companies?limit=${limit}&offset=${offset}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    } finally {
      setLoading(false);
    }
  }, [limit, offset, getAccessToken]);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (role !== "admin") {
      router.push("/dashboard");
      return;
    }
    fetchCompanies();
  }, [isLoading, user, role, fetchCompanies]);

  const validateSlug = (value: string) => {
    if (value === "legacy") {
      setSlugError('The slug "legacy" is reserved.');
      return false;
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(value)) {
      setSlugError("Slug must be lowercase alphanumeric with hyphens only.");
      return false;
    }
    setSlugError("");
    return true;
  };

  const handleCreate = async () => {
    if (!createName.trim() || !createSlug.trim()) {
      setCreateError("Name and slug are required.");
      return;
    }
    if (!validateSlug(createSlug)) return;

    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch("http://localhost:8000/api/admin/companies", {
        method: "POST",
        headers,
        body: JSON.stringify({ name: createName.trim(), slug: createSlug.trim() }),
      });
      if (res.ok) {
        setShowCreate(false);
        setCreateName("");
        setCreateSlug("");
        setCreateError("");
        await fetchCompanies();
      } else {
        const err = await res.json();
        setCreateError(err.error || "Failed to create company.");
      }
    } catch (err) {
      setCreateError("Network error.");
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between border-b border-slate-200/60 pb-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-slate-900">Company Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage all registered companies.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer"
        >
          Create Company
        </button>
      </div>

      {showCreate && (
        <div className="mt-6 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="font-display font-bold text-slate-800 text-lg mb-4">Create New Company</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Company Name</label>
              <input
                type="text"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-slate-700">Slug</label>
              <input
                type="text"
                value={createSlug}
                onChange={(e) => {
                  setCreateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                  if (slugError) validateSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""));
                }}
                placeholder="e.g. my-company"
                className="rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green"
              />
              {slugError && <p className="text-[11px] text-red-600 font-semibold">{slugError}</p>}
            </div>
          </div>
          {createError && <p className="mt-2 text-xs text-red-600 font-semibold">{createError}</p>}
          <div className="mt-4 flex gap-3">
            <button onClick={handleCreate} className="rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer">
              Create
            </button>
            <button onClick={() => { setShowCreate(false); setCreateError(""); }} className="rounded-lg border border-slate-200/80 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-8 text-center text-sm text-slate-400">Loading...</div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-bold text-slate-700 text-xs">Name</th>
                <th className="px-4 py-3 font-bold text-slate-700 text-xs">Slug</th>
                <th className="px-4 py-3 font-bold text-slate-700 text-xs">Members</th>
                <th className="px-4 py-3 font-bold text-slate-700 text-xs">Created</th>
                <th className="px-4 py-3 font-bold text-slate-700 text-xs"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {companies.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">{c.slug}</td>
                  <td className="px-4 py-3 text-slate-600">{c.member_count?.[0]?.count ?? 0}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{new Date(c.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/companies/${c.id}`}
                      className="text-mantis-green hover:underline text-xs font-semibold"
                    >
                      Manage
                    </Link>
                  </td>
                </tr>
              ))}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">No companies found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
