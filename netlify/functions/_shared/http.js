export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function methodNotAllowed() {
  return json({ error: "Method not allowed" }, 405);
}

export async function readJson(req) {
  const raw = await req.text();
  if (!raw.trim()) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed == null || typeof parsed !== "object" || Array.isArray(parsed)) {
      const error = new Error("Expected a JSON object");
      error.status = 400;
      throw error;
    }
    return parsed;
  } catch (err) {
    if (err.status === 400) throw err;
    const error = new Error("Invalid JSON");
    error.status = 400;
    throw error;
  }
}
