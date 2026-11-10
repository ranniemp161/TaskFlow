type Context = { params: Promise<{ path: string[] }> };

async function proxy(request: Request, context: Context) {
  const { path } = await context.params;
  const allowed =
    (path.length === 1 && ["users", "projects", "tasks"].includes(path[0])) ||
    (path.length === 2 &&
      path[0] === "tasks" &&
      /^[0-9a-f-]{36}$/i.test(path[1]));
  if (!allowed) return Response.json({ message: "Not found" }, { status: 404 });
  const source = new URL(request.url);
  if (request.method !== "GET") {
    const origin = request.headers.get("origin");
    if (origin && origin !== source.origin) {
      return Response.json(
        { message: "Invalid request origin" },
        { status: 403 },
      );
    }
  }
  try {
    const base = process.env.API_BASE_URL || "http://127.0.0.1:3000";
    const target = new URL("/" + path.join("/") + source.search, base);
    const response = await fetch(target, {
      method: request.method,
      headers: { "Content-Type": "application/json" },
      body: ["GET", "HEAD"].includes(request.method)
        ? undefined
        : await request.text(),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    return new Response(
      response.status === 204 ? null : await response.text(),
      {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      },
    );
  } catch {
    return Response.json(
      {
        message:
          "TaskFlow could not reach the API. Check that the backend is running, then retry.",
      },
      { status: 502 },
    );
  }
}
export { proxy as GET, proxy as POST, proxy as PATCH, proxy as DELETE };
