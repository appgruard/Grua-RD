import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const distPath = path.resolve(__dirname, "public");

  log(`Static files directory: ${distPath}`);
  log(`Current working directory: ${process.cwd()}`);
  log(`__dirname: ${__dirname}`);

  if (!fs.existsSync(distPath)) {
    log(`ERROR: Build directory not found at ${distPath}`, "error");
    
    const altPath = path.resolve(process.cwd(), "dist", "public");
    log(`Trying alternative path: ${altPath}`);
    
    if (fs.existsSync(altPath)) {
      log(`Found build directory at alternative path: ${altPath}`);
      setupStaticServing(app, altPath);
      return;
    }
    
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  const files = fs.readdirSync(distPath);
  log(`Files in dist directory: ${files.join(", ")}`);

  setupStaticServing(app, distPath);
}

function setupStaticServing(app: Express, distPath: string) {
  app.use(express.static(distPath, {
    maxAge: '1d',
    etag: true,
    lastModified: true,
  }));

  app.use("*", (_req, res) => {
    const indexPath = path.resolve(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(500).send("index.html not found");
    }
  });

  log(`Static file serving configured for: ${distPath}`);
}
