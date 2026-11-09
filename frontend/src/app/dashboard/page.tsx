
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/api";

type Profile = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

type Overview = {
  total_users: number | null;
  total_campaigns: number;
  total_simulations: number;
  total_trainings: number;
  total_training_assignments: number;
  completed_trainings: number;
  pending_trainings: number;
  training_completion_percentage: number;
};

type Training = {
  assignment_id: string;
  training_id: string;
  title: string;
  description: string | null;
  content: string;
  category: string;
  status: string;
};

export default function DashboardPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      const token = localStorage.getItem("access_token");

      if (!token) {
        router.replace("/");
        return;
      }

      try {
        const user = await apiRequest("/api/auth/me", {}, token);
        setProfile(user);

        if (user.role === "Employee") {
          const data = await apiRequest(
            "/api/trainings/my",
            {},
            token
          );
          setTrainings(data);
        } else {
          const data = await apiRequest(
            "/api/dashboard/overview",
            {},
            token
          );
          setOverview(data);
        }
      } catch (err) {
        localStorage.removeItem("access_token");
        setError(
          err instanceof Error ? err.message : "Unable to load dashboard"
        );
        router.replace("/");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [router]);

  function logout() {
    localStorage.removeItem("access_token");
    router.replace("/");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-white">
        Loading dashboard...
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-red-400">
        {error || "Unable to load your account."}
      </main>
    );
  }

  const roleMenus: Record<string, string[]> = {
    Admin: ["Dashboard", "User Management", "Campaigns", "Simulations", "Training", "Audit Logs"],
    "Campaign Manager": ["Dashboard", "Campaigns", "Simulations", "Training"],
    "Security Analyst": ["Dashboard", "Campaigns", "Simulation Reviews", "Audit Reports"],
    Auditor: ["Dashboard", "Campaign Reports", "Training Reports", "Audit Logs"],
    Employee: ["Dashboard", "My Training", "My Simulations"],
  };

  const menuItems = roleMenus[profile.role] || ["Dashboard"];

  
const menuRoutes: Record<string, string> = {
  Dashboard: "/dashboard",
  "User Management": "/users",
  Campaigns: "/campaigns",
  Simulations: "/simulations",
  Training: "/trainings",
  "My Training": "/my-training",
  "My Simulations": "/my-simulations",
  "Simulation Reviews": "/reviews",
  "Audit Reports": "/audit-logs",
  "Campaign Reports": "/campaigns",
  "Training Reports": "/trainings",
  "Audit Logs": "/audit-logs",
};


  const statistics = [
    { label: "Total Users", value: overview?.total_users ?? "—" },
    { label: "Campaigns", value: overview?.total_campaigns ?? 0 },
    { label: "Simulations", value: overview?.total_simulations ?? 0 },
    { label: "Trainings", value: overview?.total_trainings ?? 0 },
    { label: "Training Completed", value: overview?.completed_trainings ?? 0 },
    { label: "Training Pending", value: overview?.pending_trainings ?? 0 },
  ];

  return (
    <main className="flex min-h-screen bg-slate-950 text-white">
      <aside className="hidden w-64 shrink-0 border-r border-slate-800 bg-slate-900 p-6 md:block">
        <h1 className="mb-8 text-2xl font-bold text-blue-400">
          PhishGuard
        </h1>

        <p className="mb-3 text-xs uppercase tracking-wider text-slate-500">
          Navigation
        </p>

        <nav className="space-y-2">
            {menuItems.map((item) => {
                const isActive = item === "Dashboard";

                return (
                    <button
                        key={item}
                        onClick={() => {
                            const route = menuRoutes[item];

                            if (route) {
                                router.push(route);
                        }
                        }}
                        className={`w-full rounded-lg px-3 py-3 text-left text-sm transition ${
                        isActive
                            ? "bg-blue-600 font-semibold text-white"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
            >
                {item}
                </button>
                );
                })}
        </nav>
      </aside>

      <section className="min-w-0 flex-1 p-6 md:p-10">
        <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="mt-2 text-slate-400">
              Welcome, {profile.full_name}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-semibold">{profile.full_name}</p>
              <p className="text-sm text-blue-400">{profile.role}</p>
            </div>

            <button
              onClick={logout}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
            >
              Logout
            </button>
          </div>
        </header>

        {profile.role === "Employee" ? (
          <section>
            <h3 className="mb-5 text-xl font-semibold">
              My Assigned Training
            </h3>

            {trainings.length === 0 ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
                You don't have any assigned training yet.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2">
                {trainings.map((training) => (
                  <div
                    key={training.assignment_id}
                    className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                  >
                    <p className="text-sm text-blue-400">
                      {training.category}
                    </p>
                    <h4 className="mt-2 text-lg font-semibold">
                      {training.title}
                    </h4>
                    <p className="mt-2 text-sm text-slate-400">
                      {training.description}
                    </p>
                    <p className="mt-4 text-sm">
                      Status:{" "}
                      <span className="text-green-400">
                        {training.status}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        ) : (
          <section>
            <h3 className="mb-5 text-xl font-semibold">
              Platform Overview
            </h3>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {statistics.map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-slate-800 bg-slate-900 p-6"
                >
                  <p className="text-sm text-slate-400">
                    {item.label}
                  </p>
                  <p className="mt-3 text-3xl font-bold text-blue-400">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
              <h3 className="font-semibold">
                Training Completion
              </h3>

              <p className="mt-4 text-3xl font-bold text-green-400">
                {overview?.training_completion_percentage ?? 0}%
              </p>

              <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-green-500"
                  style={{
                    width: `${overview?.training_completion_percentage ?? 0}%`,
                  }}
                />
              </div>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
