
"use client";

import { useEffect, useMemo, useState } from "react";
import { apiRequest } from "@/lib/api";

type User = {
  id: string;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

const roles = [
  "Admin",
  "Campaign Manager",
  "Security Analyst",
  "Auditor",
  "Employee",
];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [search, setSearch] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Employee");
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const result = await apiRequest(
        "/api/admin/users",
        { method: "GET" },
        token
      );

      setUsers(Array.isArray(result.users) ? result.users : []);
      setTotalUsers(result.total_users ?? result.users?.length ?? 0);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load users."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const searchText = search.toLowerCase();

    return users.filter(
      (user) =>
        user.full_name.toLowerCase().includes(searchText) ||
        user.email.toLowerCase().includes(searchText) ||
        user.role.toLowerCase().includes(searchText)
    );
  }, [users, search]);

  async function handleCreateUser(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    try {
      setCreating(true);
      setError("");
      setMessage("");

      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const result = await apiRequest(
        "/api/admin/users",
        {
          method: "POST",
          body: JSON.stringify({
            full_name: fullName,
            email,
            password,
            role,
          }),
        },
        token
      );

      setMessage(result.message || "User created successfully!");

      setFullName("");
      setEmail("");
      setPassword("");
      setRole("Employee");

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create user."
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      setError("");
      setMessage("");

      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const result = await apiRequest(
        `/api/admin/users/${userId}/role`,
        {
          method: "PATCH",
          body: JSON.stringify({ role: newRole }),
        },
        token
      );

      setMessage(result.message || "User role updated successfully.");

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update role."
      );

      await loadUsers();
    }
  }

  async function handleStatusChange(user: User) {
    const newStatus = !user.is_active;

    const confirmed = window.confirm(
      `Are you sure you want to ${
        newStatus ? "activate" : "deactivate"
      } ${user.full_name}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const token = localStorage.getItem("access_token");

      if (!token) {
        throw new Error("Please log in again.");
      }

      const result = await apiRequest(
        `/api/admin/users/${user.id}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ is_active: newStatus }),
        },
        token
      );

      setMessage(result.message || "User status updated successfully.");

      await loadUsers();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update status."
      );
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-gray-900 md:p-8">
      <div className="mx-auto max-w-7xl space-y-8">

        {/* Page Heading */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              User Management
            </h1>
            <p className="mt-2 text-gray-600">
              Create users, manage roles, and control account status.
            </p>
          </div>

          <div className="rounded-xl border bg-white px-6 py-4 shadow-sm">
            <p className="text-sm text-gray-500">Total Users</p>
            <p className="text-3xl font-bold text-blue-700">
              {totalUsers}
            </p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
            {message}
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
            {error}
          </div>
        )}

        {/* Create User Form */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-xl font-bold text-gray-900">
            Create New User
          </h2>

          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                    type="text"
                    id="new-user-full-name"
                    name="new-user-full-name"
                    autoComplete="new-password"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter full name"
                    className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400"
/>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  id="new-user-email"
                  name="new-user-email"
                  autoComplete="off"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email address"
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  type="password"
                  id="new-user-password"
                  name="new-user-password"
                  autoComplete="new-user-password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  User Role
                </label>
                <select
                  id="new-user-role"
                  name="new-user-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900"
                >
                  {roles.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create User"}
            </button>
          </form>
        </section>

        {/* Users Table */}
        <section className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                All Users
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Manage registered platform accounts.
              </p>
            </div>

            <button
              onClick={loadUsers}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              Refresh
            </button>
          </div>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or role..."
            className="mb-5 w-full rounded-lg border border-gray-300 bg-white p-3 text-gray-900 placeholder-gray-400"
          />

          {loading ? (
            <p className="py-8 text-center text-gray-500">
              Loading users...
            </p>
          ) : filteredUsers.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No users found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[750px] text-left">
                <thead>
                  <tr className="border-b bg-gray-50 text-sm text-gray-600">
                    <th className="p-4">Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Action</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b last:border-0 hover:bg-gray-50"
                    >
                      <td className="p-4 font-medium text-gray-900">
                        {user.full_name}
                      </td>

                      <td className="p-4 text-gray-600">
                        {user.email}
                      </td>

                      <td className="p-4">
                    <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value)}
                        className="w-full rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900"
                    >
                        {roles.map((item) => (
                            <option
                                key={item}
                                value={item}
                                className="bg-white text-gray-900"
                            >
                                {item}
                            </option>
                        ))}
                    </select>
                      </td>

                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            user.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>

                      <td className="p-4">
                        <button
                          onClick={() => handleStatusChange(user)}
                          className={`rounded-lg px-3 py-2 text-sm font-semibold text-white ${
                            user.is_active
                              ? "bg-red-600 hover:bg-red-700"
                              : "bg-green-600 hover:bg-green-700"
                          }`}
                        >
                          {user.is_active ? "Deactivate" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
