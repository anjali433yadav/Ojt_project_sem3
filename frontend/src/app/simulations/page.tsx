
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

type Campaign = {
  id: string;
  name: string;
};

type Simulation = {
  id: string;
  title: string;
  subject: string;
  content: string;
  category: string;
  difficulty: string;
  status: string;
  ai_generated: boolean;
  campaign_id?: string;
};

type SimulationRow = Simulation & {
  campaignName: string;
  campaignId: string;
};

function getList(data: any, key?: string): any[] {
  if (Array.isArray(data)) return data;

  if (key && Array.isArray(data?.[key])) return data[key];
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.results)) return data.results;

  return [];
}

export default function SimulationsPage() {
  const router = useRouter();

  const [simulations, setSimulations] = useState<SimulationRow[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadSimulations() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        router.replace("/");
        return;
      }

      try {
        setLoading(true);
        setError("");

        const campaignsData = await apiRequest(
          "/api/campaigns",
          {},
          token
        );

        const campaigns: Campaign[] = getList(campaignsData, "campaigns");

        const results = await Promise.all(
          campaigns.map(async (campaign) => {
            try {
              const data = await apiRequest(
                `/api/campaigns/${campaign.id}/simulations`,
                {},
                token
              );

              const list: Simulation[] = getList(data, "simulations");

              return list.map((simulation) => ({
                ...simulation,
                campaignName: campaign.name,
                campaignId: campaign.id,
              }));
            } catch (err) {
              console.error(
                `Could not load simulations for ${campaign.name}`,
                err
              );
              return [];
            }
          })
        );

        if (active) {
          setSimulations(results.flat());
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error ? err.message : "Could not load simulations."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSimulations();

    return () => {
      active = false;
    };
  }, [router]);

  const filteredSimulations = useMemo(() => {
    return simulations.filter((simulation) => {
      const matchesSearch =
        simulation.title.toLowerCase().includes(search.toLowerCase()) ||
        simulation.category.toLowerCase().includes(search.toLowerCase()) ||
        simulation.campaignName.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" ||
        simulation.status.toLowerCase() === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [simulations, search, statusFilter]);

  const statusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-500/15 text-green-400";
      case "rejected":
        return "bg-red-500/15 text-red-400";
      case "pending_review":
        return "bg-yellow-500/15 text-yellow-400";
      default:
        return "bg-slate-700 text-slate-300";
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              href="/dashboard"
              className="mb-3 inline-block text-sm text-slate-400 hover:text-white"
            >
              ← Back to Dashboard
            </Link>
            <h1 className="text-3xl font-bold">Simulation Management</h1>
            <p className="mt-2 text-slate-400">
              View and manage campaign training simulations.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 px-5 py-3">
            <p className="text-sm text-slate-400">Total simulations</p>
            <p className="text-2xl font-bold">{simulations.length}</p>
          </div>
        </div>
        <Link
            href="/simulations/generate"
            className="rounded-lg bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500"
            >
                + Generate with AI
        </Link>

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, category or campaign..."
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 outline-none focus:border-blue-500"
          >
            <option value="all">All statuses</option>
            <option value="draft">Draft</option>
            <option value="pending_review">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        {loading && (
          <p className="py-10 text-center text-slate-400">
            Loading simulations...
          </p>
        )}

        {error && (
          <p className="rounded-lg border border-red-800 bg-red-950 p-4 text-red-300">
            {error}
          </p>
        )}

        {!loading && !error && filteredSimulations.length === 0 && (
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-10 text-center">
            <h2 className="text-xl font-semibold">No simulations found</h2>
            <p className="mt-2 text-slate-400">
              Create a simulation from one of your campaign detail pages.
            </p>
            <Link
              href="/campaigns"
              className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-3 font-medium hover:bg-blue-500"
            >
              View Campaigns
            </Link>
          </div>
        )}

        {!loading && filteredSimulations.length > 0 && (
          <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900">
            <table className="w-full min-w-[850px] text-left">
              <thead className="bg-slate-800 text-sm text-slate-300">
                <tr>
                  <th className="p-4">Simulation</th>
                  <th className="p-4">Campaign</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Difficulty</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredSimulations.map((simulation) => (
                  <tr
                    key={simulation.id}
                    className="border-t border-slate-800"
                  >
                    <td className="p-4">
                      <p className="font-medium">{simulation.title}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {simulation.subject}
                      </p>
                    </td>

                    <td className="p-4 text-slate-300">
                      {simulation.campaignName}
                    </td>

                    <td className="p-4 text-slate-300">
                      {simulation.category}
                    </td>

                    <td className="p-4 capitalize text-slate-300">
                      {simulation.difficulty}
                    </td>

                    <td className="p-4 text-slate-300">
                      {simulation.ai_generated ? "AI generated" : "Manual"}
                    </td>

                    <td className="p-4">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${statusStyle(
                          simulation.status
                        )}`}
                      >
                        {simulation.status.replace("_", " ")}
                      </span>
                    </td>

                    <td className="p-4">
                      <Link
                        href={`/campaigns/${simulation.campaignId}`}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        Open campaign →
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
