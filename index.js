const http = require("http");
const url = require("url");
const fs = require("fs");
const path = require("path");

const STATIC_ORIGIN = "https://salmon-island-05173d20f.1.azurestaticapps.net";

function sendJson(res, status, obj, corsOrigin = null) {
  const headers = { "Content-Type": "application/json" };
  if (corsOrigin) {
    headers["Access-Control-Allow-Origin"] = corsOrigin;
    headers["Access-Control-Allow-Methods"] = "GET,OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(obj));
}

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/plain" });
      return res.end("Not found");
    }
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(data);
  });
}

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url, true);
  const pathname = parsed.pathname;

  // Handle preflight (OPTIONS) for CORS-enabled API routes
  if (req.method === "OPTIONS" && pathname.startsWith("/api/")) {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": STATIC_ORIGIN,
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    return res.end();
  }

  // Requirement 1: Serve index.html that tests APIs (NOT the dice roller UI)
  if (req.method === "GET" && (pathname === "/" || pathname === "/index.html")) {
    const filePath = path.join(__dirname, "public", "index.html");
    return serveFile(res, filePath);
  }

  // API: wake-up
  if (req.method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, { ok: true }, STATIC_ORIGIN);
  }

  // API: random number (CORS ALLOWED)
  if (req.method === "GET" && pathname === "/api/random") {
    const min = Number(parsed.query.min ?? 1);
    const max = Number(parsed.query.max ?? 6);
    if (Number.isNaN(min) || Number.isNaN(max) || min > max) {
      return sendJson(res, 400, { error: "Invalid min/max" }, STATIC_ORIGIN);
    }
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return sendJson(res, 200, { value }, STATIC_ORIGIN);
  }

  // API: random number (INTENTIONAL CORS FAIL — no Access-Control-Allow-Origin)
  if (req.method === "GET" && pathname === "/api/random-nocors") {
    const min = Number(parsed.query.min ?? 1);
    const max = Number(parsed.query.max ?? 6);
    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return sendJson(res, 200, { value }, null); // <-- no CORS header on purpose
  }

  // Everything else
  res.writeHead(404, { "Content-Type": "text/plain" });
  res.end("Not found");
});

const port = process.env.PORT || 1337;
server.listen(port);
console.log(`Server running on port ${port}`);