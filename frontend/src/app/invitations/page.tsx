"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

function InvitationContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoading, getAccessToken, refreshCompanies } = useAuth();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<{
    companyName: string;
    role: string;
    expiresAt: string;
    accepted: boolean;
  } | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [acceptResult, setAcceptResult] = useState<string | null>(null);

  useEffect(() => {
    if (typeof document !== "undefined") {
      const meta = document.createElement("meta");
      meta.name = "referrer";
      meta.content = "no-referrer";
      document.head.appendChild(meta);
    }
  }, []);

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      const loginUrl = new URL("/login", window.location.origin);
      loginUrl.searchParams.set("redirect", `/invitations?token=${token}`);
      router.push(loginUrl.toString());
      return;
    }

    if (!token) {
      setError("No invitation token provided.");
      setLoading(false);
      return;
    }

    viewInvitation();
  }, [isLoading, user, token]);

  const viewInvitation = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/invitations/view", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        const data = await res.json();
        setInvitation(data);
      } else {
        const err = await res.json();
        setError(err.error || "Invitation not found or expired.");
      }
    } catch {
      setError("Failed to load invitation. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    setAccepting(true);
    setAcceptResult(null);
    try {
      const accessToken = await getAccessToken();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (accessToken) headers["Authorization"] = `Bearer ${accessToken}`;

      const res = await fetch("http://localhost:8000/api/invitations/accept", {
        method: "POST",
        headers,
        body: JSON.stringify({ token }),
      });

      if (res.ok) {
        await refreshCompanies();
        setAcceptResult("success");
      } else {
        const data = await res.json();
        if (res.status === 409) {
          setAcceptResult(data.error || "Already a member or invitation already accepted.");
        } else if (res.status === 404) {
          setAcceptResult("Invitation expired or invalid.");
        } else {
          setAcceptResult(data.error || "Failed to accept invitation.");
        }
      }
    } catch {
      setAcceptResult("Network error. Please try again.");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm font-semibold text-slate-400">Loading invitation...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <svg className="mx-auto h-12 w-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="mt-4 font-display text-xl font-bold text-slate-800">Invitation Not Found</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (acceptResult === "success") {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <svg className="mx-auto h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h1 className="mt-4 font-display text-xl font-bold text-slate-800">Successfully Joined!</h1>
          <p className="mt-2 text-sm text-slate-500">
            You are now a member of <strong className="text-mantis-green">{invitation?.companyName}</strong>.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-lg bg-mantis-green px-4 py-2 text-xs font-semibold text-white hover:bg-mantis-green-dark transition-colors cursor-pointer"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-center">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
        <svg className="mx-auto h-12 w-12 text-mantis-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>

        <h1 className="mt-4 font-display text-xl font-bold text-slate-800">You're Invited!</h1>

        {invitation && (
          <div className="mt-6 space-y-3 text-left">
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <p className="text-xs text-slate-500">Company</p>
              <p className="text-sm font-bold text-slate-800">{invitation.companyName}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <p className="text-xs text-slate-500">Role</p>
              <p className="text-sm font-bold text-slate-800 capitalize">{invitation.role}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3">
              <p className="text-xs text-slate-500">Expires</p>
              <p className="text-sm font-bold text-slate-800">{new Date(invitation.expiresAt).toLocaleDateString()}</p>
            </div>
          </div>
        )}

        {acceptResult && acceptResult !== "success" ? (
          <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3 text-xs font-semibold text-amber-800">
            {acceptResult}
          </div>
        ) : (
          <button
            onClick={handleAccept}
            disabled={accepting}
            className="mt-6 rounded-lg bg-mantis-green px-6 py-3 text-sm font-semibold text-white hover:bg-mantis-green-dark transition-colors disabled:opacity-50 cursor-pointer"
          >
            {accepting ? "Accepting..." : "Accept Invitation"}
          </button>
        )}

        <button
          onClick={() => router.push("/dashboard")}
          className="mt-4 block w-full text-center text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
}

export default function InvitationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center text-sm font-semibold text-slate-400">
        Loading...
      </div>
    }>
      <InvitationContent />
    </Suspense>
  );
}
