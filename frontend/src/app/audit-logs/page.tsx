
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

type AuditLog = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: string;
  actor_id: string;
  created_at: string;
};

function formatAction(action: string) {
  return action
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

function getDetails(details: string) {
  try {
    return JSON.stringify(JSON.parse(details), null, 2);
  } catch {
    return details;
  }
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("access_token");

      if (!token) {
        setError("Please log in again.");
        return;
      }

      const response = await apiRequest(
        "/api/admin/audit-logs",
        {},
        token
      );

      setLogs(Array.isArray(response) ? response : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load audit logs."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const filteredLogs = useMemo(() => {
    const query = search.toLowerCase();

    return logs.filter((log) =>
      [
        log.action,
        log.entity_type,
        log.entity_id,
        log.actor_id,
        getDetails(log.details),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [logs, search]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 text-gray-900 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-bold">Audit Logs</h1>
            <p className="mt-2 text-gray-600">
              Track important activities performed on the platform.
            </p>
          </div>

          <button
            onClick={loadLogs}
            disabled={loading}
            className="rounded-lg bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Refreshing..." : "Refresh Logs"}
          </button>
        </div>

        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Total Audit Logs</p>
            <p className="mt-2 text-3xl font-bold">{logs.length}</p>
          </div>

          <div className="rounded-xl border bg-white p-5 shadow-sm">
            <p className="text-sm text-gray-500">Matching Records</p>
            <p className="mt-2 text-3xl font-bold">
              {filteredLogs.length}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <input
            type="text"
            placeholder="Search action, entity, actor or details..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 outline-none focus:border-blue-500"
          />
        </div>

        {error && (
          <div className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          {loading ? (
            <p className="p-8 text-center text-gray-500">
              Loading audit logs...
            </p>
          ) : filteredLogs.length === 0 ? (
            <p className="p-8 text-center text-gray-500">
              No audit logs found.
            </p>
          ) : (
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-100 text-gray-700">
                <tr>
                  <th className="p-4">Action</th>
                  <th className="p-4">Entity Type</th>
                  <th className="p-4">Entity ID</th>
                  <th className="p-4">Actor ID</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">Details</th>
                </tr>
              </thead>

              <tbody>
                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-t hover:bg-gray-50"
                  >
                    <td className="p-4">
                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-800">
                        {formatAction(log.action)}
                      </span>
                    </td>

                    <td className="p-4 capitalize">
                      {log.entity_type}
                    </td>

                    <td className="p-4 font-mono text-xs text-gray-600">
                      {log.entity_id}
                    </td>

                    <td className="p-4 font-mono text-xs text-gray-600">
                      {log.actor_id}
                    </td>

                    <td className="p-4 whitespace-nowrap text-gray-600">
                      {formatDate(log.created_at)}
                    </td>

                    <td className="p-4">
                      <details className="max-w-xs">
                        <summary className="cursor-pointer font-medium text-blue-600">
                          View Details
                        </summary>
                        <pre className="mt-2 max-w-xs overflow-x-auto whitespace-pre-wrap break-words rounded bg-gray-100 p-3 text-xs text-gray-800">
                          {getDetails(log.details)}
                        </pre>
                      </details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
