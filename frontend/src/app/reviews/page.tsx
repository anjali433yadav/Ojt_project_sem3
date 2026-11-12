
"use client";

import { useCallback, useEffect, useState } from "react";
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
  status: string;
  ai_generated: boolean;
};

function getList(data: any): Simulation[] {
  const list = Array.isArray(data)
    ? data
    : data?.simulations ??
      data?.items ??
      data?.results ??
      [];

  if (!Array.isArray(list)) return [];

  return list
    .filter(
      (item: any) =>
        item &&
        typeof item.simulation_id === "string" &&
        item.simulation_id.trim() !== ""
    );
}

export default function ReviewsPage() {
  const router = useRouter();

  const [simulations, setSimulations] = useState<Simulation[]>([]);
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

      const data = await apiRequest("/api/reviews/pending", {}, token);

      console.log("Pending review API response:", data);

      const list = getList(data);
      console.log("Simulation IDs:", list.map((item) => item.simulation_id));

      setSimulations(list);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load pending reviews."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

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

    const reviewComment = comments[simulationId] || "";

    if (decision === "rejected" && !reviewComment.trim()) {
      setError("Please provide a comment before rejecting a simulation.");
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

      setMessage(`Simulation ${decision} successfully.`);
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
    }finally {
      setProcessingId("");
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/dashboard"
          className="text-sm text-slate-400 hover:text-white"
        >
          ← Back to Dashboard
        </Link>

        <h1 className="mt-5 text-3xl font-bold">Simulation Reviews</h1>
        <p className="mt-2 text-slate-400">
          Review AI-generated training simulations before approval.
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 bg-slate-900 p-5">
          <p className="text-sm text-slate-400">Pending reviews</p>
          <p className="mt-1 text-3xl font-bold">{simulations.length}</p>
        </div>

        {loading && (
          <p className="mt-8 text-center text-slate-400">
            Loading pending reviews...
          </p>
        )}

        {error && (
          <p className="mt-5 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {error}
          </p>
        )}

        {message && (
          <p className="mt-5 rounded-lg border border-green-800 bg-green-950 p-4 text-green-300">
            {message}
          </p>
        )}

        {!loading && simulations.length === 0 && !error && (
          <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
            <h2 className="text-xl font-semibold">No pending reviews</h2>
            <p className="mt-2 text-slate-400">
              All submitted simulations have been reviewed.
            </p>
          </div>
        )}

        <div className="mt-6 space-y-6">
          {simulations.map((simulation, index) => (
            <article
              key={simulation.simulation_id || `simulation-${index}`}
              className="rounded-xl border border-slate-800 bg-slate-900 p-6"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-semibold">
                  {simulation.title}
                </h2>
                <span className="rounded-full bg-yellow-500/15 px-3 py-1 text-xs text-yellow-400">
                  Pending review
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-400">
                Subject: {simulation.subject}
              </p>

              <p className="mt-1 text-sm text-slate-400">
                {simulation.category} · {simulation.difficulty} ·{" "}
                {simulation.ai_generated ? "AI generated" : "Manual"}
              </p>

              <div className="mt-5 whitespace-pre-wrap rounded-lg bg-slate-950 p-4 text-sm leading-7 text-slate-300">
                {simulation.content}
              </div>

              <label className="mt-5 block">
                <span className="mb-2 block text-sm text-slate-300">
                  Review comment
                </span>
                <textarea
                  rows={3}
                  value={comments[simulation.simulation_id] || ""}
                  onChange={(e) =>
                    setComments((previous) => ({
                      ...previous,
                      [simulation.simulation_id]: e.target.value,
                    }))
                  }
                  placeholder="Enter feedback. Required when rejecting."
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                />
              </label>

              <div className="mt-5 flex flex-wrap gap-3">
                <button
                  onClick={() => {
                    console.log("Approving simulation:", simulation);
                    reviewSimulation(simulation.simulation_id, "approved");
                  }}
                  disabled={processingId === simulation.simulation_id}
                  className="rounded-lg bg-green-600 px-5 py-3 font-semibold hover:bg-green-500 disabled:opacity-50"
                >
                  Approve
                </button>

                <button
                  onClick={() => {
                    console.log("Rejecting simulation:", simulation);
                    reviewSimulation(simulation.simulation_id, "rejected");
                    }}
                  disabled={processingId === simulation.simulation_id}
                  className="rounded-lg bg-red-600 px-5 py-3 font-semibold hover:bg-red-500 disabled:opacity-50"
                >
                  Reject
                </button>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
