import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { logger } from "./logger";
import { pool, initializeTicketTables } from "./db";
import { checkStorageHealth } from "./services/object-storage";

const app = express();

const isDevelopment = process.env.NODE_ENV === "development";

app.use(
  helmet({
    contentSecurityPolicy: isDevelopment ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "'unsafe-eval'", 
          "https://maps.googleapis.com",
          "https://maps.gstatic.com",
          "https://js.stripe.com"
        ],
        styleSrc: [
          "'self'", 
          "'unsafe-inline'", 
          "https://fonts.googleapis.com",
          "https://maps.googleapis.com"
        ],
        fontSrc: [
          "'self'", 
          "https://fonts.gstatic.com",
          "https://maps.gstatic.com"
        ],
        imgSrc: [
          "'self'", 
          "data:", 
          "https:", 
          "blob:",
          "https://maps.googleapis.com",
          "https://maps.gstatic.com"
        ],
        connectSrc: [
          "'self'", 
          "https://maps.googleapis.com",
          "https://api.stripe.com",
          "https://m.stripe.network",
          "https://hooks.stripe.com",
          "wss:", 
          "ws:"
        ],
        frameSrc: [
          "'self'", 
          "https://js.stripe.com",
          "https://hooks.stripe.com"
        ],
        frameAncestors: ["'self'"],
        workerSrc: ["'self'", "blob:"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
  })
);

const allowedOrigins = isDevelopment
  ? ["http://localhost:5000", "http://127.0.0.1:5000"]
  : process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) || [];

app.use(
  cors({
    origin: (origin, callback) => {
      if (isDevelopment) {
        return callback(null, true);
      }
      
      if (!origin) {
        return callback(null, true);
      }
      
      // Allow Capacitor native apps (capacitor:// and ionic:// schemes)
      if (origin.startsWith('capacitor://') || origin.startsWith('ionic://')) {
        return callback(null, true);
      }
      
      // Allow file:// for local testing on mobile devices
      if (origin.startsWith('file://')) {
        return callback(null, true);
      }
      
      if (allowedOrigins.length === 0) {
        logger.error("ALLOWED_ORIGINS not configured in production. Blocking CORS request from origin: " + origin);
        logger.error("Set ALLOWED_ORIGINS environment variable with comma-separated origins (e.g., 'https://app.gruard.com,https://www.gruard.com')");
        return callback(new Error("CORS not configured"));
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}. Allowed origins: ${allowedOrigins.join(", ")}`);
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  })
);

app.get("/health", async (_req: Request, res: Response) => {
  const timestamp = new Date().toISOString();
  const uptime = process.uptime();
  const environment = process.env.NODE_ENV || "development";

  // Check database health
  let databaseStatus = "healthy";
  let databaseResponseTime = 0;
  let databaseError: string | undefined;
  const dbStart = Date.now();
  try {
    await pool.query('SELECT 1');
    databaseResponseTime = Date.now() - dbStart;
  } catch (error) {
    databaseStatus = "unhealthy";
    databaseResponseTime = Date.now() - dbStart;
    databaseError = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Database health check failed', {
      error: databaseError
    });
  }

  // Check object storage health
  let objectStorageStatus = "healthy";
  let objectStorageResponseTime = 0;
  let objectStorageError: string | undefined;
  try {
    const storageHealth = await checkStorageHealth();
    objectStorageStatus = storageHealth.status;
    objectStorageResponseTime = storageHealth.responseTime;
    objectStorageError = storageHealth.error;
  } catch (error) {
    objectStorageStatus = "unhealthy";
    objectStorageResponseTime = 0;
    objectStorageError = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Object Storage health check failed', {
      error: objectStorageError
    });
  }

  // Determine overall status
  let overallStatus = "healthy";
  let httpStatus = 200;
  
  if (databaseStatus === "unhealthy") {
    // Database is critical - return 503
    overallStatus = "unhealthy";
    httpStatus = 503;
  } else if (objectStorageStatus === "unhealthy") {
    // Object storage is not critical - degraded but still operational
    overallStatus = "degraded";
    httpStatus = 200;
  }

  res.status(httpStatus).json({
    status: overallStatus,
    timestamp,
    uptime,
    environment,
    dependencies: {
      database: {
        status: databaseStatus,
        responseTime: databaseResponseTime,
        ...(databaseError && { error: databaseError }),
      },
      objectStorage: {
        status: objectStorageStatus,
        responseTime: objectStorageResponseTime,
        ...(objectStorageError && { error: objectStorageError }),
      },
    },
  });
});

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}
app.use(express.json({
  limit: '20mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '20mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize ticket tables if they don't exist (non-blocking)
  initializeTicketTables().catch(err => {
    logger.warn("Ticket tables initialization failed (will retry on first use):", err.message);
  });
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
