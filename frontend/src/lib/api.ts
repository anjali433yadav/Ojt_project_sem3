
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {},
  token?: string
) {
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
  const message =
    typeof data.detail === "string"
      ? data.detail
      : data.detail
        ? JSON.stringify(data.detail)
        : typeof data.message === "string"
          ? data.message
          : "Something went wrong";

  throw new Error(message);
}

  return data;
}
