import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export function serveStatic(app: Express) {
  // In production, static files are in dist/public relative to the executable
  // Try multiple possible paths
  const possiblePaths = [
    path.resolve(__dirname, "public"),
    path.resolve(process.cwd(), "dist", "public"),
    path.resolve(process.cwd(), "public"),
  ];

  let distPath: string | null = null;
  for (const p of possiblePaths) {
    if (fs.existsSync(p) && fs.existsSync(path.join(p, "index.html"))) {
      distPath = p;
      log(`Found static files at: ${p}`);
      break;
    }
  }

  if (!distPath) {
    log(`Static paths checked: ${possiblePaths.join(", ")}`, "error");
    throw new Error(
      `Could not find the build directory with index.html. Checked: ${possiblePaths.join(", ")}`,
    );
  }

  app.use(express.static(distPath));

  // Catch-all for SPA routing - only for non-API routes
  app.use("*", (req, res, next) => {
    // Skip API routes and health checks
    if (req.originalUrl.startsWith("/api") || req.originalUrl === "/health") {
      return next();
    }
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
