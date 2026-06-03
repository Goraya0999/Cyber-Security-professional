import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/jwt";

export function requireLiveTrafficAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
  const queryToken = typeof req.query["token"] === "string" ? req.query["token"] : undefined;
  const token = bearerToken ?? queryToken;

  if (!token) {
    res.status(401).json({ error: "Unauthorized", message: "Missing live traffic auth token" });
    return;
  }

  try {
    req.user = verifyToken(token);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized", message: "Invalid live traffic auth token" });
  }
}
