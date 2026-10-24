import type { Config, Context } from "@netlify/functions";

function readEnv(name: string): string | undefined {
  try {
    const value = Netlify.env.get(name);
    return value == null ? undefined : value;
  } catch {
    return undefined;
  }
}

function missingStarburstSettings(): string[] {
  const required = [
    "STARBURST_HOST",
    "STARBURST_USER",
    "STARBURST_PASSWORD",
    "STARBURST_CATALOG",
    "STARBURST_SCHEMA",
    "STARBURST_COURSES_TABLE",
  ];
  return required.filter((name) => {
    const value = readEnv(name);
    return value == null || value.trim() === "";
  });
}

/**
 * Read-only Starburst proxy. The browser must never receive Galaxy credentials.
 * No courses table was verified in this environment, so this function does not
 * open a connection and does not invent rows. Prefer bronze, silver, or gold.
 * The default cluster is adhoc. raw_sb_* and raw_redshift are not queried.
 */
export default async (req: Request, _context: Context) => {
  if (req.method !== "GET" && req.method !== "POST") {
    return Response.json({ error: "method not allowed" }, { status: 405 });
  }

  const cluster = readEnv("STARBURST_CLUSTER")?.trim() || "adhoc";
  const missing = missingStarburstSettings();
  const message = missing.length
    ? `Starburst Galaxy is not configured (${missing.join(", ")}). No query was run. Set the server env vars, prefer a bronze, silver, or gold catalog, and keep the cluster on ${cluster} unless a catalog requires another one.`
    : `Starburst settings are present, but no courses table was verified against Galaxy DDL, so the proxy did not query cluster ${cluster}. No rows were returned or fabricated.`;

  return Response.json(
    {
      error: "not configured",
      message,
      cluster,
    },
    {
      status: 503,
      headers: { "cache-control": "no-store" },
    },
  );
};

export const config: Config = {
  path: "/api/starburst-roster",
  method: ["GET", "POST"],
};
