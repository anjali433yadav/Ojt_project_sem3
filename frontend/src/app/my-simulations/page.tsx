
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Simulation = {
  simulation_id: string;
  title: string;
  subject: string;
  content: string;
  category: string;
  difficulty: string;
  campaign_name: string;
  outcome: string;
  opened_at: string | null;
  reported_at: string | null;
};

export default function MySimulationsPage() {
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);

  const loadSimulations = useCallback(async () => {
    try {
      setError("");
      const token = localStorage.getItem("access_token");

      if (!token) {
        window.location.href = "/";
        return;
      }

      const data = await apiRequest(
        "/api/simulations/my",
        {},
        token
      );

      setSimulations(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load simulations."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSimulations();
  }, [loadSimulations]);

  async function openSimulation(simulationId: string) {
    try {
      const token = localStorage.getItem("access_token");

      await apiRequest(
        `/api/simulations/${simulationId}/open`,
        { method: "POST" },
        token!
      );

      setSelectedId(simulationId);
      setMessage("Simulation opened successfully.");

      await loadSimulations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not open simulation."
      );
    }
  }

  async function reportSimulation(simulationId: string) {
    if (feedback.trim().length < 3) {
      setError("Please enter at least 3 characters of feedback.");
      return;
    }

    try {
      const token = localStorage.getItem("access_token");
      setReportingId(simulationId);
      setError("");

      await apiRequest(
        `/api/simulations/${simulationId}/report`,
        {
          method: "POST",
          body: JSON.stringify({ feedback }),
        },
        token!
      );

      setMessage("Your report has been submitted successfully.");
      setFeedback("");
      setSelectedId(null);

      await loadSimulations();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not submit report."
      );
    } finally {
      setReportingId(null);
    }
  }

  if (loading) {
    return <main className="p-8">Loading your simulations...</main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            My Simulations
          </h1>
          <p className="mt-2 text-gray-600">
            Review your assigned cybersecurity awareness examples.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-lg bg-green-100 p-3 text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-lg bg-red-100 p-3 text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Total assigned</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {simulations.length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Opened</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {simulations.filter((s) => s.opened_at).length}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5">
            <p className="text-sm text-gray-500">Reported</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {simulations.filter((s) => s.reported_at).length}
            </p>
          </div>
        </div>

        {simulations.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold text-gray-800">
              No simulations assigned yet
            </h2>
            <p className="mt-2 text-gray-500">
              Approved training simulations assigned to you will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {simulations.map((simulation) => (
              <div
                key={simulation.simulation_id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">
                      {simulation.title}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {simulation.subject}
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-100 px-3 py-1 text-sm text-blue-700">
                    {simulation.outcome}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-sm">
                  <span className="rounded bg-gray-100 px-3 py-1 text-gray-700">
                    {simulation.category}
                  </span>
                  <span className="rounded bg-gray-100 px-3 py-1 text-gray-700">
                    {simulation.difficulty}
                  </span>
                  <span className="rounded bg-gray-100 px-3 py-1 text-gray-700">
                    {simulation.campaign_name}
                  </span>
                </div>

                {selectedId === simulation.simulation_id && (
                  <div className="mt-5 rounded-lg border bg-gray-50 p-5">
                    <h3 className="mb-3 font-semibold text-gray-800">
                      Simulation Content
                    </h3>

                    <div className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-700">
                      {simulation.content}
                    </div>

                    <div className="mt-5 border-t pt-5">
                      <label className="mb-2 block text-sm font-medium text-gray-800">
                        Report this example (optional)
                      </label>

                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="Tell us why this example seems suspicious..."
                        rows={3}
                        className="w-full rounded-lg border p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />

                      <button
                        onClick={() =>
                          reportSimulation(simulation.simulation_id)
                        }
                        disabled={reportingId === simulation.simulation_id}
                        className="mt-3 rounded-lg bg-orange-600 px-5 py-2 text-white hover:bg-orange-700 disabled:opacity-50"
                      >
                        {reportingId === simulation.simulation_id
                          ? "Submitting..."
                          : "Submit Report"}
                      </button>
                    </div>
                  </div>
                )}

                <div className="mt-5">
                  {selectedId !== simulation.simulation_id ? (
                    <button
                      onClick={() =>
                        openSimulation(simulation.simulation_id)
                      }
                      className="rounded-lg bg-blue-600 px-5 py-2 text-white hover:bg-blue-700"
                    >
                      Open Simulation
                    </button>
                  ) : (
                    <button
                      onClick={() => setSelectedId(null)}
                      className="rounded-lg border px-5 py-2 text-gray-700 hover:bg-gray-100"
                    >
                      Close
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
