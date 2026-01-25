import express, { type Request, Response, NextFunction } from "express";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import { registerRoutes } from "./routes";
import { serveStatic, log } from "./static";
import { logger } from "./logger";
import { pool, initializeTicketTables } from "./db";
import { checkStorageHealth } from "./services/object-storage";
import { errorHandler, notFoundHandler } from "./middleware/error-handler";

const app = express();

// Trust proxy when behind reverse proxy (CapRover/nginx)
// This is required for secure cookies to work correctly with HTTPS
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

const STATIC_FILE_EXTENSIONS = /\.(js|css|woff2|woff|ttf|eot|otf|png|jpg|jpeg|gif|svg|ico|webp|avif|mp4|webm|pdf|map)$/i;
const FONT_EXTENSIONS = /\.(woff2|woff|ttf|eot|otf)$/i;
const HASHED_ASSET_PATTERN = /[-_.][A-Za-z0-9_-]{6,}\.(js|css)$/;

function isStaticFileRequest(path: string): boolean {
  return STATIC_FILE_EXTENSIONS.test(path);
}

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  
  const originalSend = res.send;
  res.send = function(body) {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    }
    return originalSend.call(this, body);
  };
  
  const originalJson = res.json;
  res.json = function(body) {
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    }
    return originalJson.call(this, body);
  };
  
  const originalEnd = res.end;
  res.end = function(this: Response, chunk?: any, encoding?: BufferEncoding | (() => void), cb?: () => void) {
    const endTime = process.hrtime.bigint();
    const durationMs = Number(endTime - start) / 1e6;
    if (!res.headersSent) {
      res.setHeader('X-Response-Time', `${durationMs.toFixed(2)}ms`);
    }
    return originalEnd.call(this, chunk, encoding as BufferEncoding, cb);
  } as typeof res.end;
  
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const path = req.path;
  
  if (FONT_EXTENSIONS.test(path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vary', 'Accept-Encoding');
  } else if (HASHED_ASSET_PATTERN.test(path)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Vary', 'Accept-Encoding');
  } else if (STATIC_FILE_EXTENSIONS.test(path)) {
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Vary', 'Accept-Encoding');
  }
  
  next();
});

app.use((req: Request, res: Response, next: NextFunction) => {
  const acceptHeader = req.headers.accept || '';
  const isHtmlRequest = acceptHeader.includes('text/html');
  const path = req.path;
  
  if (isHtmlRequest && !isStaticFileRequest(path) && !path.startsWith('/api')) {
    const hints: string[] = [];
    
    hints.push('</fonts/inter-400.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin');
    hints.push('</fonts/inter-500.woff2>; rel=preload; as=font; type="font/woff2"; crossorigin');
    
    hints.push('<https://api.mapbox.com>; rel=preconnect');
    hints.push('<https://tiles.mapbox.com>; rel=preconnect');
    
    if (hints.length > 0) {
      res.setHeader('Link', hints.join(', '));
    }
  }
  
  next();
});

declare global {
  namespace Express {
    interface Request {
      isStaticFile?: boolean;
    }
  }
}

app.use((req: Request, res: Response, next: NextFunction) => {
  req.isStaticFile = isStaticFileRequest(req.path);
  next();
});

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
}));

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
          "https://api.mapbox.com"
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
          "https://api.mapbox.com",
          "https://events.mapbox.com",
          "https://api.azul.com.do",
          "wss:", 
          "ws:"
        ],
        frameSrc: [
          "'self'"
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

// Permitir CORS para endpoints de callback 3DS de Azul (antes del middleware principal)
// Estos endpoints reciben POSTs desde el ACS de Azul (dominio externo)
app.use([
  '/api/payments/azul/3ds-callback',
  '/api/payments/azul/3ds-method-notification',
  '/api/azul/3ds/callback',
  '/api/azul/3ds/method-notification'
], cors({
  origin: true, // Permitir cualquier origen para estos endpoints
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
}));

const allowedOrigins = isDevelopment
  ? ["http://localhost:5000", "http://127.0.0.1:5000"]
  : process.env.ALLOWED_ORIGINS?.split(",").map(o => o.trim()) || [];

app.use(
  cors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
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
      
      // Allow Azul 3DS ACS domains
      if (origin.includes('modirum.com') || origin.includes('azul.com.do')) {
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

app.get("/debug/env", (_req: Request, res: Response) => {
  const envVars = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'SESSION_SECRET',
    'ALLOWED_ORIGINS',
    'MAPBOX_ACCESS_TOKEN',
    'VITE_MAPBOX_ACCESS_TOKEN',
    'VAPID_PUBLIC_KEY',
    'VAPID_PRIVATE_KEY',
    'RESEND_API_KEY',
    'TWILIO_ACCOUNT_SID',
  ];
  
  const status: Record<string, string> = {};
  for (const key of envVars) {
    const value = process.env[key];
    if (value) {
      status[key] = `SET (${value.length} chars)`;
    } else {
      status[key] = 'NOT SET';
    }
  }
  
  res.json({
    timestamp: new Date().toISOString(),
    trustProxy: app.get("trust proxy"),
    envStatus: status,
  });
});

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
    await pool.query('SELECT 1' as any);
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
  if (req.isStaticFile) {
    return next();
  }

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

  // 404 handler for unmatched API routes (must be after all routes, before error handler)
  app.use('/api/*', notFoundHandler);
  
  // Global error handler - catches all errors and creates tickets for system errors
  app.use(errorHandler);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    // Use Function wrapper to prevent esbuild from statically bundling vite.ts
    // This ensures the vite package (devDependency) is not required in production
    const loadVite = new Function('return import("./vite")') as () => Promise<typeof import("./vite")>;
    const { setupVite } = await loadVite();
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
