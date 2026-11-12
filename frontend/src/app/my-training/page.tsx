
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type TrainingAssignment = {
  assignment_id: string;
  training_id: string;
  title: string;
  description: string;
  content: string;
  category: string;
  status: "assigned" | "completed";
  completed_at: string | null;
};

export default function MyTrainingPage() {
  const [trainings, setTrainings] = useState<TrainingAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);

  const loadTrainings = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("Please log in again.");
        return;
      }

      const response = await apiRequest(
        "/api/trainings/my",
        {},
        token
      );

      setTrainings(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load your training."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrainings();
  }, [loadTrainings]);

  const markCompleted = async (assignmentId: string) => {
    try {
      setCompletingId(assignmentId);
      setError("");

      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("Please log in again.");
        return;
      }

      await apiRequest(
        `/api/trainings/assignments/${assignmentId}/complete`,
        {
          method: "PATCH",
        },
        token
      );

      await loadTrainings();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not mark training as completed."
      );
    } finally {
      setCompletingId(null);
    }
  };

  const completedCount = trainings.filter(
    (training) => training.status === "completed"
  ).length;

  const pendingCount = trainings.length - completedCount;

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">My Training</h1>
            <p className="mt-2 text-gray-600">
              Learn cybersecurity and improve your security awareness.
            </p>
          </div>

          <button
            onClick={loadTrainings}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="mb-8 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Training</p>
            <p className="mt-2 text-3xl font-bold">{trainings.length}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Completed</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {completedCount}
            </p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Pending</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {pendingCount}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-xl border bg-white p-10 text-center text-gray-500">
            Loading your training...
          </div>
        ) : trainings.length === 0 ? (
          <div className="rounded-xl border bg-white p-10 text-center">
            <h2 className="text-xl font-semibold">No training assigned</h2>
            <p className="mt-2 text-gray-500">
              Your assigned cybersecurity training will appear here.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2">
            {trainings.map((training) => (
              <div
                key={training.assignment_id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800">
                    {training.category}
                  </span>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      training.status === "completed"
                        ? "bg-green-100 text-green-800"
                        : "bg-orange-100 text-orange-800"
                    }`}
                  >
                    {training.status === "completed"
                      ? "Completed"
                      : "Pending"}
                  </span>
                </div>

                <h2 className="text-xl font-bold">{training.title}</h2>

                <p className="mt-2 text-sm text-gray-600">
                  {training.description}
                </p>

                <div className="mt-5 rounded-lg bg-gray-50 p-4">
                  <h3 className="mb-2 font-semibold">
                    Training Material
                  </h3>

                  <p className="whitespace-pre-wrap text-sm leading-6 text-gray-700">
                    {training.content}
                  </p>
                </div>

                {training.status === "completed" ? (
                  <div className="mt-5 rounded-lg bg-green-50 p-3 text-sm text-green-800">
                    <p className="font-semibold">
                      Training completed successfully!
                    </p>

                    {training.completed_at && (
                      <p className="mt-1">
                        Completed on:{" "}
                        {new Date(training.completed_at).toLocaleString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => markCompleted(training.assignment_id)}
                    disabled={completingId === training.assignment_id}
                    className="mt-5 w-full rounded-lg bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {completingId === training.assignment_id
                      ? "Marking Completed..."
                      : "Mark as Completed"}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
