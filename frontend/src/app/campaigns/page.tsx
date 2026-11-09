
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

type Campaign = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_by: string;
  start_date: string | null;
  end_date: string | null;
};

function getList(data: any): Campaign[] {
  if (Array.isArray(data)) return data;

  const list = data?.campaigns ?? data?.items ?? data?.results;
  return Array.isArray(list) ? list : [];
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        router.replace("/");
        return;
      }

      try {
        const [user, data] = await Promise.all([
          apiRequest("/api/auth/me", {}, token),
          apiRequest("/api/campaigns", {}, token),
        ]);

        setRole(user.role);
        setCampaigns(getList(data));

        if (!Array.isArray(data) && !Array.isArray(data?.campaigns)
          && !Array.isArray(data?.items) && !Array.isArray(data?.results)) {
          console.error("Unexpected campaigns response:", data);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load campaigns");
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  const canCreate = role === "Admin" || role === "Campaign Manager";

  if (loading) {
    return <main className="min-h-screen bg-slate-950 p-10 text-white">Loading campaigns...</main>;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-sm text-blue-400 hover:underline">
              ← Back to Dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-bold">Campaign Management</h1>
            <p className="mt-2 text-slate-400">
              Create, manage and monitor security awareness campaigns.
            </p>
          </div>

          {canCreate && (
            <button
              onClick={() => router.push("/campaigns/new")}
              className="rounded-lg bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500"
            >
              + Create Campaign
            </button>
          )}
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {error}
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
            <h2 className="text-xl font-semibold">No campaigns yet</h2>
            <p className="mt-2 text-slate-400">
              Create your first campaign to get started.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-slate-400">
                <tr>
                  <th className="p-4">Campaign</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Start date</th>
                  <th className="p-4">End date</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {campaigns.map((campaign) => (
                  <tr key={campaign.id} className="border-b border-slate-800 last:border-0">
                    <td className="p-4">
                      <p className="font-semibold">{campaign.name}</p>
                      <p className="mt-1 max-w-xs truncate text-slate-400">
                        {campaign.description || "No description"}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="rounded-full bg-slate-800 px-3 py-1 text-xs">
                        {campaign.status}
                      </span>
                    </td>
                    <td className="p-4 text-slate-300">
                      {campaign.start_date
                        ? new Date(campaign.start_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-4 text-slate-300">
                      {campaign.end_date
                        ? new Date(campaign.end_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/campaigns/${campaign.id}`}
                        className="font-semibold text-blue-400 hover:underline"
                      >
                        Open →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
