
"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  start_date: string | null;
  end_date: string | null;
};

type Employee = {
  id: string;
  full_name: string;
  email: string;
};

type Target = {
  id: string;
  user_id?: string;
  full_name: string;
  email: string;
  status: string;
};

type Simulation = {
  id: string;
  title: string;
  subject: string;
  category: string;
  difficulty: string;
  status: string;
  ai_generated: boolean;
};

function getList<T>(data: any, key: string): T[] {
  if (Array.isArray(data)) return data;

  const list = data?.[key] ?? data?.items ?? data?.results;
  return Array.isArray(list) ? list : [];
}

function CampaignDetailsContent() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = params.campaignId;
  const router = useRouter();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [targets, setTargets] = useState<Target[]>([]);
  const [simulations, setSimulations] = useState<Simulation[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [role, setRole] = useState("");

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [content, setContent] = useState("");
  const [category, setCategory] = useState("Email Security");
  const [difficulty, setDifficulty] = useState("beginner");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const canManage = role === "Admin" || role === "Campaign Manager";

  const loadData = useCallback(async () => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/");
      return;
    }

    try {
      const user = await apiRequest("/api/auth/me", {}, token);
      setRole(user.role);

      const [campaignData, targetData, simulationData] = await Promise.all([
        apiRequest(`/api/campaigns/${campaignId}`, {}, token),
        apiRequest(`/api/campaigns/${campaignId}/targets`, {}, token),
        apiRequest(`/api/campaigns/${campaignId}/simulations`, {}, token),
      ]);

      setCampaign(campaignData);
      setName(campaignData.name);
      setDescription(campaignData.description || "");
      setStartDate(campaignData.start_date?.slice(0, 10) || "");
      setEndDate(campaignData.end_date?.slice(0, 10) || "");

      setTargets(getList<Target>(targetData, "targets"));
      setSimulations(getList<Simulation>(simulationData, "simulations"));

      if (user.role === "Admin" || user.role === "Campaign Manager") {
        const employeeData = await apiRequest(
          "/api/campaigns/eligible-employees",
          {},
          token
        );
        setEmployees(getList<Employee>(employeeData, "employees"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load campaign");
    } finally {
      setLoading(false);
    }
  }, [campaignId, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function updateCampaign(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (startDate && endDate && endDate < startDate) {
      setError("End date cannot be before start date.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return router.replace("/");

    setSaving(true);

    try {
      await apiRequest(
        `/api/campaigns/${campaignId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            name,
            description: description || null,
            start_date: startDate ? new Date(startDate).toISOString() : null,
            end_date: endDate ? new Date(endDate).toISOString() : null,
          }),
        },
        token
      );

      setMessage("Campaign details updated successfully.");
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update campaign");
    } finally {
      setSaving(false);
    }
  }

  function toggleEmployee(employeeId: string) {
    setSelectedEmployees((current) =>
      current.includes(employeeId)
        ? current.filter((id) => id !== employeeId)
        : [...current, employeeId]
    );
  }

  async function assignEmployees() {
    setError("");
    setMessage("");

    if (selectedEmployees.length === 0) {
      setError("Select at least one employee.");
      return;
    }

    const token = localStorage.getItem("access_token");
    if (!token) return router.replace("/");

    setSaving(true);

    try {
      const result = await apiRequest(
        `/api/campaigns/${campaignId}/targets`,
        {
          method: "POST",
          body: JSON.stringify({ user_ids: selectedEmployees }),
        },
        token
      );

      setMessage(
        `Assignment complete. Assigned: ${result.assigned_count ?? "check list"}; skipped: ${result.skipped_count ?? 0}.`
      );
      setSelectedEmployees([]);
      const data = await apiRequest(
        `/api/campaigns/${campaignId}/targets`,
        {},
        token
      );
      setTargets(getList<Target>(data, "targets"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to assign employees");
    } finally {
      setSaving(false);
    }
  }

  async function createSimulation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setMessage("");

    const token = localStorage.getItem("access_token");
    if (!token) return router.replace("/");

    setSaving(true);

    try {
      await apiRequest(
        `/api/campaigns/${campaignId}/simulations`,
        {
          method: "POST",
          body: JSON.stringify({
            title,
            subject,
            content,
            category,
            difficulty,
          }),
        },
        token
      );

      setTitle("");
      setSubject("");
      setContent("");
      setMessage("Simulation draft created successfully.");

      const data = await apiRequest(
        `/api/campaigns/${campaignId}/simulations`,
        {},
        token
      );
      setSimulations(getList<Simulation>(data, "simulations"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create simulation");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-10 text-white">Loading campaign...</main>;
  }

  if (!campaign) {
    return (
      <main className="min-h-screen bg-slate-950 p-10 text-white">
        <p className="text-red-400">{error || "Campaign not found."}</p>
        <Link href="/campaigns" className="mt-4 inline-block text-blue-400">
          Back to Campaigns
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl space-y-8">
        <div>
          <Link href="/campaigns" className="text-sm text-blue-400 hover:underline">
            ← Back to Campaigns
          </Link>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">{campaign.name}</h1>
              <p className="mt-2 text-slate-400">
                Campaign status: {campaign.status}
              </p>
            </div>

            <span className="rounded-full bg-slate-800 px-4 py-2 text-sm">
              {campaign.status}
            </span>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {error}
          </div>
        )}

        {message && (
          <div className="rounded-lg border border-green-800 bg-green-950 p-4 text-green-300">
            {message}
          </div>
        )}

        {canManage && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-5 text-xl font-bold">Edit Campaign</h2>

            <form onSubmit={updateCampaign} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm">Campaign name</label>
                <input
                  required
                  minLength={3}
                  maxLength={150}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm">Start date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm">End date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                  />
                </div>
              </div>

              <button
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </form>
          </section>
        )}

        {canManage && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-2 text-xl font-bold">Assign Employees</h2>
            <p className="mb-5 text-sm text-slate-400">
              Select active employees to include in this campaign.
            </p>

            {employees.length === 0 ? (
              <p className="text-slate-400">No active employees found.</p>
            ) : (
              <div className="mb-5 grid gap-3 sm:grid-cols-2">
                {employees.map((employee) => {
                  const alreadyAssigned = targets.some(
                    (target) =>
                      target.user_id === employee.id ||
                      target.email === employee.email
                  );

                  return (
                    <label
                      key={employee.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-700 p-4 hover:bg-slate-800"
                    >
                      <input
                        type="checkbox"
                        checked={selectedEmployees.includes(employee.id)}
                        disabled={alreadyAssigned}
                        onChange={() => toggleEmployee(employee.id)}
                        className="h-4 w-4 accent-blue-500"
                      />
                      <span className="min-w-0">
                        <span className="block font-medium">{employee.full_name}</span>
                        <span className="block truncate text-xs text-slate-400">
                          {employee.email}
                          {alreadyAssigned ? " · Already assigned" : ""}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <button
              onClick={assignEmployees}
              disabled={saving || selectedEmployees.length === 0}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
            >
              Assign Selected Employees ({selectedEmployees.length})
            </button>
          </section>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-bold">
            Assigned Employees ({targets.length})
          </h2>

          {targets.length === 0 ? (
            <p className="text-slate-400">No employees assigned yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-slate-400">
                  <tr>
                    <th className="p-3">Employee</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((target, index) => (
                    <tr
                        key={target.id ?? target.user_id ?? index}
                        className="border-t border-slate-800"
                    >
                      <td className="p-3">{target.full_name}</td>
                      <td className="p-3 text-slate-400">{target.email}</td>
                      <td className="p-3">{target.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {canManage && (
          <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="mb-2 text-xl font-bold">Create Simulation</h2>
            <p className="mb-5 text-sm text-slate-400">
              Create a safe training simulation draft for this campaign.
            </p>

            <form onSubmit={createSimulation} className="space-y-4">
              <input
                required
                minLength={3}
                maxLength={200}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Simulation title"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
              />

              <input
                required
                minLength={3}
                maxLength={255}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Email subject"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
              />

              <textarea
                required
                minLength={10}
                rows={6}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write safe awareness-training email content. Do not include real credential collection or external phishing links."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
              />

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm">Category</label>
                  <input
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
              </div>

              <button
                disabled={saving}
                className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
              >
                {saving ? "Creating..." : "Create Simulation Draft"}
              </button>
            </form>
          </section>
        )}

        <section className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-5 text-xl font-bold">
            Campaign Simulations ({simulations.length})
          </h2>

          {simulations.length === 0 ? (
            <p className="text-slate-400">No simulations created for this campaign yet.</p>
          ) : (
            <div className="space-y-3">
              {simulations.map((simulation) => (
                <div
                  key={simulation.id}
                  className="rounded-lg border border-slate-700 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h3 className="font-semibold">{simulation.title}</h3>
                    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                      {simulation.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">
                    {simulation.subject}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    {simulation.category} · {simulation.difficulty} ·{" "}
                    {simulation.ai_generated ? "AI generated" : "Manually created"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
export default function CampaignDetailsPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-slate-950 p-10 text-white">
          Loading campaign details...
        </main>
      }
    >
      <CampaignDetailsContent />
    </Suspense>
  );
}