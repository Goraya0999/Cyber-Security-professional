import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

/**
 * API key middleware for protecting sensitive endpoints like POST /scan.
 *
 * In production, keys should be stored in a database with per-key rate limits
 * and rotation policies. Here we use a single environment-variable key for
 * simplicity while maintaining the correct middleware signature.
 *
 * Usage:
 *   router.post("/scan", requireApiKey, scanHandler);
 *
 * Clients must send:
 *   X-API-Key: <value of DIDS_API_KEY env var>
 *
 * If DIDS_API_KEY is not set, the middleware falls through (open in dev mode).
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  const configuredKey = process.env["DIDS_API_KEY"];

  // If no key is configured, skip auth (development mode)
  if (!configuredKey) {
    logger.warn("DIDS_API_KEY not set — API key check skipped (dev mode)");
    next();
    return;
  }

  const clientKey = req.headers["x-api-key"];

  if (!clientKey || clientKey !== configuredKey) {
    logger.warn({ ip: req.ip, url: req.url }, "Rejected request: invalid or missing API key");
    res.status(401).json({
      error: "Unauthorized",
      message: "A valid X-API-Key header is required for this endpoint.",
    });
    return;
  }

  next();
}
