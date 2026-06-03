import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { signToken } from "../lib/jwt";
import { requireAuth } from "../middlewares/requireAuth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// Input validation schemas
// ---------------------------------------------------------------------------

const SignupSchema = z.object({
  username: z.string().min(3).max(30).regex(/^\w+$/, "Username may only contain letters, numbers, and underscores"),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ---------------------------------------------------------------------------
// POST /auth/signup
// ---------------------------------------------------------------------------

router.post("/auth/signup", async (req, res): Promise<void> => {
  const parsed = SignupSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: "Validation Error",
      message: parsed.error.issues.map((i: { message: string }) => i.message).join(", "),
    });
    return;
  }

  const { username, email, password } = parsed.data;

  // Check for duplicate email or username
  const [existingByEmail] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existingByEmail) {
    res.status(409).json({ error: "Conflict", message: "An account with this email already exists." });
    return;
  }

  const [existingByUsername] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.username, username))
    .limit(1);

  if (existingByUsername) {
    res.status(409).json({ error: "Conflict", message: "This username is already taken." });
    return;
  }

  // Hash password (12 rounds for security/performance balance)
  const hashedPassword = await bcrypt.hash(password, 12);

  // Insert user
  const [user] = await db
    .insert(usersTable)
    .values({
      username,
      email: email.toLowerCase(),
      hashedPassword,
    })
    .returning();

  if (!user) {
    res.status(500).json({ error: "Internal Server Error", message: "Failed to create user." });
    return;
  }

  logger.info({ userId: user.id, username }, "New user registered");

  const token = signToken({ sub: user.id, username: user.username, email: user.email });

  res.status(201).json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
});

// ---------------------------------------------------------------------------
// POST /auth/login
// ---------------------------------------------------------------------------

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(422).json({
      error: "Validation Error",
      message: parsed.error.issues.map((i: { message: string }) => i.message).join(", "),
    });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  // Use constant-time comparison to prevent timing attacks
  const passwordMatch = user ? await bcrypt.compare(password, user.hashedPassword) : false;

  if (!user || !passwordMatch) {
    // Generic error — don't reveal whether the email exists
    res.status(401).json({ error: "Unauthorized", message: "Invalid email or password." });
    return;
  }

  logger.info({ userId: user.id, username: user.username }, "User logged in");

  const token = signToken({ sub: user.id, username: user.username, email: user.email });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      createdAt: user.createdAt,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /auth/me
// ---------------------------------------------------------------------------

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.sub;

  const [user] = await db
    .select({
      id: usersTable.id,
      username: usersTable.username,
      email: usersTable.email,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "Not Found", message: "User not found." });
    return;
  }

  res.json(user);
});

export default router;
