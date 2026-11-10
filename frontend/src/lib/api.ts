/** Calls the Next.js /api proxy, which forwards to the NestJS backend. */
export async function api<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch("/api/" + path, {
    ...options,
    headers: { "Content-Type": "application/json" },
    cache: "no-store",
  });
  const data = response.status === 204 ? undefined : await response.json();
  if (!response.ok)
    throw new Error(
      Array.isArray(data?.message)
        ? data.message.join(". ")
        : data?.message || "Request failed. Please retry.",
    );
  return data as T;
}

/** Fetches every page of a paginated list endpoint. */
export async function allPages<T>(path: string): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; ; page++) {
    const batch = await api<T[]>(path + "?limit=100&page=" + page);
    rows.push(...batch);
    if (batch.length < 100) return rows;
  }
}

export function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please retry.";
}
