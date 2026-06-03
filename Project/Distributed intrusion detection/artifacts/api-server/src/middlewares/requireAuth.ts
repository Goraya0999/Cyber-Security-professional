import type { Request, Response, NextFunction } from "express";
import { verifyToken, type JwtPayload } from "../lib/jwt";

// Augment Express Request type to include the authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/**
 * JWT authentication middleware.
 *
 * Reads the `Authorization: Bearer <token>` header, verifies the JWT,
 * and attaches the decoded payload to `req.user`.
 *
 * Returns 401 if the token is missing, malformed, or expired.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers["authorization"];

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({
      error: "Unauthorized",
      message: "Missing or malformed Authorization header. Expected: Bearer <token>",
    });
    return;
  }

  const token = authHeader.slice(7); // Remove "Bearer " prefix

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch (err: unknown) {
    const isExpired = err instanceof Error && err.message.includes("expired");
    res.status(401).json({
      error: "Unauthorized",
      message: isExpired
        ? "Token has expired. Please log in again."
        : "Invalid token. Please log in again.",
    });
  }
}
