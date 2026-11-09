
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiRequest } from "@/lib/api";

export default function NewCampaignPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (startDate && endDate && endDate < startDate) {
      setError("End date cannot be before start date.");
      return;
    }

    const token = localStorage.getItem("access_token");

    if (!token) {
      router.replace("/");
      return;
    }

    setSaving(true);

    try {
      await apiRequest(
        "/api/campaigns",
        {
          method: "POST",
          body: JSON.stringify({
            name,
            description: description || null,
            start_date: startDate ? new Date(startDate).toISOString() : null,
            end_date: endDate ? new Date(endDate).toISOString() : null,
          }),
        },
        token
      );

      router.push("/campaigns");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create campaign");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-2xl">
        <Link href="/campaigns" className="text-sm text-blue-400 hover:underline">
          ← Back to Campaigns
        </Link>

        <h1 className="mb-2 mt-5 text-3xl font-bold">Create Campaign</h1>
        <p className="mb-8 text-slate-400">
          Enter the details of your security awareness campaign.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div>
            <label className="mb-2 block text-sm">Campaign name</label>
            <input
              required
              minLength={3}
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
              placeholder="Example: Email Security Awareness"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm">Description</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 outline-none focus:border-blue-500"
              placeholder="Describe the purpose of this campaign"
            />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
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

          {error && <p className="text-sm text-red-400">{error}</p>}

          <button
            disabled={saving}
            className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-50"
          >
            {saving ? "Creating..." : "Create Campaign"}
          </button>
        </form>
      </div>
    </main>
  );
}
