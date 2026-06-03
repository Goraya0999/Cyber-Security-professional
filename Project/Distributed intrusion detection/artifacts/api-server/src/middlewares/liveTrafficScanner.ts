import type { NextFunction, Request, Response } from "express";
import { makeLiveTrafficEntry, recordLiveTraffic } from "../lib/liveTrafficService";

const ignoredPrefixes = [
  "/favicon.ico",
  "/robots.txt",
  "/assets/",
];

function shouldSkip(req: Request): boolean {
  if (req.method === "OPTIONS") return true;
  return ignoredPrefixes.some((prefix) => req.path.startsWith(prefix));
}

export function liveTrafficScanner(req: Request, res: Response, next: NextFunction): void {
  if (shouldSkip(req)) {
    next();
    return;
  }

  res.on("finish", () => {
    void recordLiveTraffic(makeLiveTrafficEntry(req, res.statusCode));
  });

  next();
}
