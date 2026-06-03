import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"];

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required but was not provided.");
}

export interface JwtPayload {
  sub: number; // user id
  username: string;
  email: string;
}

/**
 * Sign a JWT for the given user. Default expiry: 7 days.
 */
export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET!, { expiresIn: "7d" });
}

/**
 * Verify and decode a JWT. Returns the payload or throws if invalid/expired.
 */
export function verifyToken(token: string): JwtPayload {
  const decoded = jwt.verify(token, JWT_SECRET!);
  if (typeof decoded === "string") {
    throw new Error("Invalid token payload");
  }
  return decoded as unknown as JwtPayload;
}
