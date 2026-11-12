
"use client";

import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";

type Training = {
  training_id: string;
  title: string;
  description: string | null;
  content: string;
  category: string;
  is_published: boolean;
};

type Employee = {
  id: string;
  full_name: string;
  email: string;
};

type Progress = {
  total_assigned: number;
  completed: number;
  pending: number;
  completion_percentage: number;
  employees?: {
    employee_name: string;
    status: string;
  }[];
};

export default function TrainingsPage() {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("");

  const [selectedTraining, setSelectedTraining] = useState("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [progress, setProgress] = useState<Progress | null>(null);

  const token =
    typeof window !== "undefined"
      ? localStorage.getItem("access_token")
      : null;

  const loadData = useCallback(async () => {
    try {
      setError("");

      if (!token) {
        window.location.href = "/";
        return;
      }

      const data = await apiRequest("/api/trainings", {}, token);

      setTrainings(
        Array.isArray(data)
          ? data
          : data.trainings ?? data.items ?? data.results ?? []
      );

      const employeeData = await apiRequest(
        "/api/campaigns/eligible-employees",
        {},
        token
      );

      setEmployees(
        Array.isArray(employeeData)
          ? employeeData
          : employeeData.employees ?? []
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load training data."
      );
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function createTraining(e: React.FormEvent) {
    e.preventDefault();

    try {
      setError("");
      setMessage("");

      await apiRequest(
        "/api/trainings",
        {
          method: "POST",
          body: JSON.stringify({
            title,
            description,
            content,
            category,
          }),
        },
        token!
      );

      setMessage("Training created successfully!");
      setTitle("");
      setDescription("");
      setContent("");
      setCategory("");

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create training."
      );
    }
  }

  async function publishTraining(training: Training) {
    try {
      setError("");

      await apiRequest(
        `/api/trainings/${training.training_id}/publish`,
        {
          method: "PATCH",
          body: JSON.stringify({
            is_published: !training.is_published,
          }),
        },
        token!
      );

      setMessage(
        training.is_published
          ? "Training unpublished."
          : "Training published successfully!"
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update training."
      );
    }
  }

  async function assignTraining() {
    if (!selectedTraining || selectedEmployees.length === 0) {
      setError("Select a training and at least one employee.");
      return;
    }

    try {
      setError("");

      const result = await apiRequest(
        `/api/trainings/${selectedTraining}/assign`,
        {
          method: "POST",
          body: JSON.stringify({
            employee_ids: selectedEmployees,
          }),
        },
        token!
      );

      setMessage(
        `Assignment complete! Assigned: ${result.assigned_count}, skipped: ${result.skipped_count}.`
      );

      setSelectedEmployees([]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not assign training."
      );
    }
  }

  async function loadProgress(trainingId: string) {
    try {
      setError("");
      setSelectedTraining(trainingId);

      const data = await apiRequest(
        `/api/trainings/${trainingId}/progress`,
        {},
        token!
      );

      setProgress(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load progress."
      );
    }
  }

  if (loading) {
    return <main className="p-8">Loading training management...</main>;
  }
  console.log(
    "Training IDs:",
    trainings.map((training) => ({
      id: training.training_id,
      title: training.title,
    }))
  );

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-10">
      <div className="mx-auto max-w-6xl">

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Training Management
          </h1>
          <p className="mt-2 text-gray-600">
            Create courses, assign employees, and track learning progress.
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

        {/* Create Training */}

        <section className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Create New Training
          </h2>

          <form onSubmit={createTraining} className="space-y-4">

            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Training title"
              required
              minLength={3}
              maxLength={200}
              className="w-full rounded-lg border p-3 placeholder:text-gray-400 text-black"
            />

            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (e.g. Email Security)"
              required
              minLength={2}
              className="w-full rounded-lg border p-3 placeholder:text-gray-400 text-black"
            />

            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short description"
              rows={2}
              className="w-full rounded-lg border p-3 placeholder:text-gray-400 text-black"
            />

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write training material here..."
              rows={6}
              required
              minLength={10}
              className="w-full rounded-lg border p-3 placeholder:text-gray-400 text-black"
            />

            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
            >
              Create Training
            </button>
          </form>
        </section>

        {/* Training List */}

        <section className="mb-8">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            All Training Courses ({trainings.length})
          </h2>

          {trainings.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-500">
              No training courses found. Create your first training above.
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {trainings.map((training, index) => (
                <div
                    key={training.training_id ?? `${training.title}-${index}`}
                    className="rounded-xl border bg-white p-6 shadow-sm">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {training.title}
                  </h3>

                  <p className="mt-2 text-sm text-gray-600">
                    {training.description}
                  </p>

                  <p className="mt-3 text-sm text-gray-500">
                    Category: {training.category}
                  </p>

                  <span
                    className={`mt-3 inline-block rounded-full px-3 py-1 text-xs ${
                      training.is_published
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {training.is_published ? "Published" : "Draft"}
                  </span>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <button
                      onClick={() => publishTraining(training)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white"
                    >
                      {training.is_published ? "Unpublish" : "Publish"}
                    </button>

                    <button
                      onClick={() => loadProgress(training.training_id)}
                      className="rounded-lg border px-4 py-2 text-sm text-gray-700"
                    >
                      View Progress
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Assign Training */}

        <section className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-semibold text-gray-900">
            Assign Training to Employees
          </h2>

          <select
            value={selectedTraining}
            onChange={(e) => {
                setSelectedTraining(e.target.value);
                setProgress(null);
            }}
            className="mb-4 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900"
            >
            <option value="" disabled className="text-gray-500">
                Select training
            </option>

            {trainings
              .filter((training) => training.is_published)
              .map((training, index) => (
                <option
                  key={training.training_id || `${training.title}-${index}`}
                  value={training.training_id}
                  className="bg-white text-blue-700"
                >
                  {training.title}
              </option>
            ))}
            
          </select>
            
          <div className="mb-5 max-h-60 space-y-3 overflow-y-auto rounded-lg border p-4">
            {employees.map((employee) => (
              <label
                key={employee.id}
                className="flex cursor-pointer items-center gap-3"
              >
                <input
                  type="checkbox"
                  checked={selectedEmployees.includes(employee.id)}
                  onChange={(e) => {
                    setSelectedEmployees((old) =>
                      e.target.checked
                        ? [...old, employee.id]
                        : old.filter((id) => id !== employee.id)
                    );
                  }}
                />

                <span className="text-sm text-gray-700">
                  {employee.full_name} ({employee.email})
                </span>
              </label>
            ))}

            {employees.length === 0 && (
              <p className="text-sm text-gray-500">
                No active employees found.
              </p>
            )}
          </div>

          <button
            onClick={assignTraining}
            className="rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700"
          >
            Assign Training
          </button>
        </section>

        {/* Progress */}

        {progress && (
          <section className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-xl font-semibold text-gray-900">
              Training Progress
            </h2>

            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-gray-50 p-4">
                <p className="text-sm text-gray-500">Assigned</p>
                <p className="mt-2 text-2xl font-bold">
                  {progress.total_assigned}
                </p>
              </div>

              <div className="rounded-lg bg-green-50 p-4">
                <p className="text-sm text-gray-500">Completed</p>
                <p className="mt-2 text-2xl font-bold text-green-700">
                  {progress.completed}
                </p>
              </div>

              <div className="rounded-lg bg-yellow-50 p-4">
                <p className="text-sm text-gray-500">Pending</p>
                <p className="mt-2 text-2xl font-bold text-yellow-700">
                  {progress.pending}
                </p>
              </div>

              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-gray-500">Completion</p>
                <p className="mt-2 text-2xl font-bold text-blue-700">
                  {progress.completion_percentage}%
                </p>
              </div>
            </div>

            <div className="mt-6 h-3 overflow-hidden rounded-full bg-gray-200">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${progress.completion_percentage}%`,
                }}
              />
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
