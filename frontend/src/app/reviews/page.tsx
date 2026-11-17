"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

type Simulation = {
  simulation_id: string;
  title: string;
  subject: string;
  content: string;
  category: string;
  difficulty: string;
  status: "pending_review" | "approved" | "rejected" | string;
  ai_generated: boolean;
  campaign_id?: string;
  campaign_name?: string;
  review_comment?: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
};

function getList(data: any): Simulation[] {
  const list = Array.isArray(data)
    ? data
    : data?.simulations ??
      data?.items ??
      data?.results ??
      [];

  if (!Array.isArray(list)) return [];

  return list.filter(
    (item: any) =>
      item &&
      typeof item.simulation_id === "string" &&
      item.simulation_id.trim() !== ""
  );
}

export default function ReviewsPage() {
  const router = useRouter();

  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [comments, setComments] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [processingId, setProcessingId] = useState("");

  const loadReviews = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Fetch all reviews with campaign names and review comments
      const data = await apiRequest("/api/reviews?status=all", {}, token).catch(async () => {
        // Fallback to /api/reviews/pending if needed
        return await apiRequest("/api/reviews/pending", {}, token);
      });

      const list = getList(data);
      setSimulations(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load simulation reviews."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const counts = useMemo(() => {
    return {
      pending: simulations.filter((s) => s.status.toLowerCase() === "pending_review").length,
      approved: simulations.filter((s) => s.status.toLowerCase() === "approved").length,
      rejected: simulations.filter((s) => s.status.toLowerCase() === "rejected").length,
      all: simulations.length,
    };
  }, [simulations]);

  const displayedSimulations = useMemo(() => {
    if (activeTab === "pending") {
      return simulations.filter((s) => s.status.toLowerCase() === "pending_review");
    }
    if (activeTab === "approved") {
      return simulations.filter((s) => s.status.toLowerCase() === "approved");
    }
    if (activeTab === "rejected") {
      return simulations.filter((s) => s.status.toLowerCase() === "rejected");
    }
    return simulations;
  }, [simulations, activeTab]);

  async function reviewSimulation(
    simulationId: string,
    decision: "approved" | "rejected"
  ) {
    if (!simulationId || simulationId === "undefined") {
      setError("Invalid simulation ID. Please refresh the page.");
      return;
    }
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/");
      return;
    }

    const reviewComment = (comments[simulationId] || "").trim();

    if (decision === "rejected" && !reviewComment) {
      setError("Please provide a rejection comment explaining why this simulation was rejected.");
      return;
    }

    try {
      setProcessingId(simulationId);
      setError("");
      setMessage("");

      await apiRequest(
        `/api/reviews/${simulationId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            decision,
            review_comment: reviewComment,
          }),
        },
        token
      );

      setMessage(`Simulation ${decision === "approved" ? "approved" : "rejected"} successfully.`);
      // Clear comment for this simulation
      setComments((prev) => {
        const next = { ...prev };
        delete next[simulationId];
        return next;
      });

      await loadReviews();
    } catch (err: any) {
      console.error("Review error:", err);
      const detail = err?.message ?? err?.detail;
      setError(
        typeof detail === "string"
          ? detail
          : detail
            ? JSON.stringify(detail)
            : "Review action failed. Check the browser console."
      );
    } finally {
      setProcessingId("");
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <span className="rounded-full bg-green-500/15 px-3 py-1 text-xs font-medium text-green-400 border border-green-500/20">Approved</span>;
      case "rejected":
        return <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400 border border-red-500/20">Rejected</span>;
      case "pending_review":
      default:
        return <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-xs font-medium text-yellow-400 border border-yellow-500/20">Pending review</span>;
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="text-sm text-slate-400 hover:text-white transition"
        >
          ← Back to Dashboard
        </Link>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Simulation Reviews</h1>
            <p className="mt-2 text-slate-400">
              Human-in-the-loop review pipeline for AI-generated training simulations.
            </p>
          </div>
          <button
            onClick={() => loadReviews()}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
          >
            ↻ Refresh
          </button>
        </div>

        {/* Status Metrics Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <button
            onClick={() => setActiveTab("pending")}
            className={`rounded-xl border p-4 text-left transition ${
              activeTab === "pending"
                ? "border-yellow-500 bg-yellow-950/20 shadow-lg shadow-yellow-900/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-slate-400">Pending</p>
            <p className="mt-1 text-2xl font-bold text-yellow-400">{counts.pending}</p>
          </button>

          <button
            onClick={() => setActiveTab("approved")}
            className={`rounded-xl border p-4 text-left transition ${
              activeTab === "approved"
                ? "border-green-500 bg-green-950/20 shadow-lg shadow-green-900/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-slate-400">Approved</p>
            <p className="mt-1 text-2xl font-bold text-green-400">{counts.approved}</p>
          </button>

          <button
            onClick={() => setActiveTab("rejected")}
            className={`rounded-xl border p-4 text-left transition ${
              activeTab === "rejected"
                ? "border-red-500 bg-red-950/20 shadow-lg shadow-red-900/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-slate-400">Rejected</p>
            <p className="mt-1 text-2xl font-bold text-red-400">{counts.rejected}</p>
          </button>

          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-xl border p-4 text-left transition ${
              activeTab === "all"
                ? "border-blue-500 bg-blue-950/20 shadow-lg shadow-blue-900/10"
                : "border-slate-800 bg-slate-900 hover:border-slate-700"
            }`}
          >
            <p className="text-xs uppercase tracking-wider text-slate-400">All Total</p>
            <p className="mt-1 text-2xl font-bold text-white">{counts.all}</p>
          </button>
        </div>

        {/* Notifications */}
        {error && (
          <div className="mt-5 rounded-lg border border-red-800 bg-red-950/60 p-4 text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="mt-5 rounded-lg border border-green-800 bg-green-950/60 p-4 text-green-300">
            {message}
          </div>
        )}

        {loading && (
          <div className="py-12 text-center text-slate-400">
            Loading reviews...
          </div>
        )}

        {/* Empty state */}
        {!loading && displayedSimulations.length === 0 && (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
            <h2 className="text-xl font-semibold">No simulations in {activeTab} status</h2>
            <p className="mt-2 text-slate-400">
              {activeTab === "pending"
                ? "All submitted simulations have been reviewed! You can generate more from the simulation page."
                : `There are currently no simulations marked as ${activeTab}.`}
            </p>
            <Link
              href="/simulations/generate"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 font-medium hover:bg-blue-500"
            >
              + Generate New Simulation
            </Link>
          </div>
        )}

        {/* Simulation Items List */}
        <div className="mt-6 space-y-6">
          {displayedSimulations.map((simulation, index) => {
            const isPending = simulation.status.toLowerCase() === "pending_review";
            const isRejected = simulation.status.toLowerCase() === "rejected";
            const isApproved = simulation.status.toLowerCase() === "approved";

            return (
              <article
                key={simulation.simulation_id || `sim-${index}`}
                className="rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-md"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{simulation.title}</h2>
                    <p className="mt-1 text-xs text-slate-400">
                      Subject: <span className="text-slate-200">{simulation.subject}</span>
                    </p>
                  </div>
                  <div>{getStatusBadge(simulation.status)}</div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                  <span className="rounded bg-slate-800 px-2.5 py-1 text-slate-300">
                    Category: {simulation.category}
                  </span>
                  <span className="rounded bg-slate-800 px-2.5 py-1 capitalize text-slate-300">
                    Difficulty: {simulation.difficulty}
                  </span>
                  {simulation.campaign_name && (
                    <span className="rounded bg-slate-800 px-2.5 py-1 text-blue-400">
                      Campaign: {simulation.campaign_name}
                    </span>
                  )}
                  <span className="rounded bg-slate-800 px-2.5 py-1 text-purple-400">
                    {simulation.ai_generated ? "🤖 AI Generated (RAG)" : "✍️ Manual"}
                  </span>
                </div>

                {/* Simulation Content Body */}
                <div className="mt-4 whitespace-pre-wrap rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm leading-relaxed text-slate-300">
                  {simulation.content}
                </div>

                {/* Display Rejection Reason if Rejected */}
                {isRejected && simulation.review_comment && (
                  <div className="mt-4 rounded-lg border border-red-800/60 bg-red-950/40 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-red-400">
                      Rejection Reason & Feedback:
                    </p>
                    <p className="mt-1 text-sm text-red-200">{simulation.review_comment}</p>
                    {simulation.reviewed_at && (
                      <p className="mt-2 text-xs text-red-400/80">
                        Reviewed on {new Date(simulation.reviewed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                )}

                {/* Display Approval notes if Approved */}
                {isApproved && (
                  <div className="mt-4 rounded-lg border border-green-800/40 bg-green-950/20 p-3">
                    <p className="text-xs text-green-300">
                      ✓ This simulation is approved and active for employee assignments.
                      {simulation.review_comment ? ` Note: "${simulation.review_comment}"` : ""}
                    </p>
                  </div>
                )}

                {/* Pending Review Action Controls */}
                {isPending && (
                  <div className="mt-5 border-t border-slate-800 pt-5">
                    <label className="block">
                      <span className="mb-2 block text-sm text-slate-300">
                        Review feedback <span className="text-slate-500">(Required if rejecting)</span>
                      </span>
                      <textarea
                        rows={3}
                        value={comments[simulation.simulation_id] || ""}
                        onChange={(e) =>
                          setComments((prev) => ({
                            ...prev,
                            [simulation.simulation_id]: e.target.value,
                          }))
                        }
                        placeholder="Provide feedback or state reasons for rejection..."
                        className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                      />
                    </label>

                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        onClick={() => reviewSimulation(simulation.simulation_id, "approved")}
                        disabled={processingId === simulation.simulation_id}
                        className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-500 disabled:opacity-50 transition"
                      >
                        {processingId === simulation.simulation_id ? "Processing..." : "✓ Approve Simulation"}
                      </button>

                      <button
                        onClick={() => reviewSimulation(simulation.simulation_id, "rejected")}
                        disabled={processingId === simulation.simulation_id}
                        className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50 transition"
                      >
                        {processingId === simulation.simulation_id ? "Processing..." : "✕ Reject Simulation"}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
