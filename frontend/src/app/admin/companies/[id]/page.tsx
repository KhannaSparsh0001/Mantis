"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";

interface Member {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
}

export default function AdminCompanyDetailPage() {
  const { user, isLoading, role, getAccessToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [company, setCompany] = useState<{ name: string; slug: string } | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignError, setAssignError] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteProductCount, setDeleteProductCount] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const fetchCompanyAndMembers = useCallback(async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = {};
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const [companyRes, membersRes] = await Promise.all([
        fetch(`http://localhost:8000/api/admin/companies?limit=200&offset=0`, { headers }),
        fetch(`http://localhost:8000/api/companies/${id}/members`, { headers }),
      ]);

      if (companyRes.ok) {
        const { data } = await companyRes.json();
        const found = data.find((c: any) => c.id === id);
        setCompany(found || null);
      }
      if (membersRes.ok) {
        setMembers(await membersRes.json());
      }
    } catch (err) {
      console.error("Failed to load company:", err);
    } finally {
      setLoading(false);
    }
  }, [id, getAccessToken]);

  useEffect(() => {
    if (!isLoading && (!user || role !== "admin")) {
      router.push("/dashboard");
      return;
    }
    fetchCompanyAndMembers();
  }, [isLoading, user, role, fetchCompanyAndMembers]);

  const handleAssign = async () => {
    if (!assignUserId.trim()) return;
    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/admin/companies/${id}/members`, {
        method: "POST",
        headers,
        body: JSON.stringify({ userId: assignUserId.trim() }),
      });
      if (res.ok) {
        setAssignUserId("");
        setAssignError("");
        await fetchCompanyAndMembers();
      } else {
        const err = await res.json();
        setAssignError(err.error || "Failed to assign.");
      }
    } catch {
      setAssignError("Network error.");
    }
  };

  const handleDelete = async () => {
    const token = await getAccessToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    try {
      const res = await fetch(`http://localhost:8000/api/admin/companies/${id}`, {
        method: "DELETE",
        headers,
        body: JSON.stringify({ confirm: true }),
      });
      if (res.ok) {
        router.push("/admin/companies");
      } else {
        const err = await res.json();
        if (res.status === 409) {
          setDeleteProductCount(err.productCount || 0);
        }
        setDeleteError(err.error || "Failed to delete.");
      }
    } catch {
      setDeleteError("Network error.");
    }
  };

  if (loading) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-400">Loading...</div>;
  }

  if (!company) {
    return <div className="mx-auto max-w-7xl px-4 py-8 text-sm text-slate-500">Company not found.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="border-b border-slate-200/60 pb-5">
        <h1 className="font-display text-2xl font-bold text-slate-900">{company.name}</h1>
        <p className="mt-1 text-sm text-slate-500">Slug: {company.slug}</p>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="font-display font-bold text-slate-800 text-lg mb-4">Members</h2>
          <div className="space-y-2">
            {members.map((m) => (
              <div key={m.id} className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-2">
                <div>
                  <span className="text-xs font-semibold text-slate-700">{m.user_id}</span>
                  <span className={`ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    m.role === 'admin' ? 'bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/10' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {m.role}
                  </span>
                </div>
              </div>
            ))}
            {members.length === 0 && <p className="text-xs text-slate-400">No members.</p>}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-4">
            <h3 className="text-xs font-bold text-slate-700 mb-2">Assign Company Admin</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                placeholder="User ID"
                className="flex-1 rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-xs font-semibold outline-none focus:border-mantis-green"
              />
              <button onClick={handleAssign} className="rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer">
                Assign
              </button>
            </div>
            {assignError && <p className="mt-1 text-[11px] text-red-600 font-semibold">{assignError}</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <h2 className="font-display font-bold text-slate-800 text-lg mb-4">Danger Zone</h2>
          <p className="text-xs text-slate-500 mb-4">Deleting this company will remove all memberships.</p>
          {deleteProductCount !== null && (
            <p className="text-xs text-amber-600 font-semibold mb-2">
              This company has {deleteProductCount} product(s). Remove or reassign them first.
            </p>
          )}
          {deleteError && <p className="text-xs text-red-600 font-semibold mb-2">{deleteError}</p>}

          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer"
            >
              Delete Company
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs font-bold text-red-700">Are you sure? This action cannot be undone.</p>
              <label className="flex items-center gap-2 text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={deleteConfirm}
                  onChange={() => {}}
                  className="rounded border-slate-300"
                />
                I confirm I want to delete this company
              </label>
              <div className="flex gap-2">
                <button onClick={handleDelete} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700 transition-colors cursor-pointer">
                  Confirm Delete
                </button>
                <button onClick={() => { setDeleteConfirm(false); setDeleteError(""); }} className="rounded-lg border border-slate-200/80 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
