import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");

function loadEnv(file) {
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === "") process.env[key] = value;
  }
}

loadEnv(path.join(root, ".env"));

const functionNames = [
  "health.js",
  "list-pending.js",
  "list-activity.js",
  "send-offers.js",
  "send-sub-request.js",
  "send-ica-reminder.js",
  "send-general-inquiry-reply.js",
  "check-nat-window.js",
  "reset-preview.js",
];

const routes = [];
for (const name of functionNames) {
  const mod = await import(path.join(root, "netlify", "functions", name));
  const methods = []
    .concat(mod.config?.method || ["GET", "POST"])
    .map((method) => method.toUpperCase());
  if (!mod.config?.path || typeof mod.default !== "function") {
    throw new Error(`${name} is missing a path or handler`);
  }
  routes.push({ path: mod.config.path, methods, handler: mod.default });
}

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".json": "application/json; charset=utf-8",
};

function send(res, status, body, headers = {}) {
  res.writeHead(status, headers);
  res.end(body);
}

function serveStatic(urlPath, res) {
  const requested = decodeURIComponent(urlPath.split("?")[0]);
  const rel = requested === "/" ? "/index.html" : requested;
  const file = path.normalize(path.join(publicDir, rel));
  if (!file.startsWith(publicDir)) return send(res, 403, "Forbidden");
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return send(res, 404, "Not found");
  res.writeHead(200, {
    "Content-Type": types[path.extname(file)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(file).pipe(res);
}

const port = Number(process.env.PORT || 4177);
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const route = routes.find((item) => item.path === url.pathname);
  if (!route) {
    if (req.method !== "GET" && req.method !== "HEAD") {
      return send(res, 404, JSON.stringify({ error: "Not found" }), {
        "Content-Type": "application/json; charset=utf-8",
      });
    }
    return serveStatic(url.pathname, res);
  }
  if (!route.methods.includes(req.method)) {
    return send(res, 405, JSON.stringify({ error: "Method not allowed" }), {
      "Content-Type": "application/json; charset=utf-8",
    });
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = Buffer.concat(chunks);
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value == null) continue;
    if (["host", "content-length", "transfer-encoding", "connection"].includes(key)) continue;
    headers.set(key, Array.isArray(value) ? value.join(", ") : value);
  }
  const request = new Request(url, {
    method: req.method,
    headers,
    body: req.method === "GET" || req.method === "HEAD" ? undefined : body,
  });

  try {
    const response = await route.handler(request, {});
    const payload = Buffer.from(await response.arrayBuffer());
    const out = {};
    response.headers.forEach((value, key) => {
      out[key] = value;
    });
    res.writeHead(response.status, out);
    res.end(payload);
  } catch (err) {
    console.error(err);
    send(res, 500, JSON.stringify({ error: err.message || "Internal error" }), {
      "Content-Type": "application/json; charset=utf-8",
    });
  }
});

server.listen(port, "0.0.0.0", () => {
  console.log(`Staffing desk running at http://127.0.0.1:${port}`);
});
