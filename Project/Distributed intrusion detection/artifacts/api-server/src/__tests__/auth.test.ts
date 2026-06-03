/**
 * Auth routes test suite
 *
 * Tests all auth endpoints with various valid and invalid scenarios.
 * Uses supertest to make real HTTP requests against the Express app.
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import app from "../app";

// Test user fixture
const TEST_USER = {
  username: "testuser_auth",
  email: "testauth@example.com",
  password: "StrongPassword123!",
};

async function cleanupTestUser() {
  await db.delete(usersTable).where(eq(usersTable.email, TEST_USER.email));
}

describe("POST /api/auth/signup", () => {
  beforeAll(async () => {
    await cleanupTestUser();
  });

  afterAll(async () => {
    await cleanupTestUser();
  });

  it("should create a new user and return JWT + profile", async () => {
    const res = await request(app).post("/api/auth/signup").send(TEST_USER);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(typeof res.body.token).toBe("string");
    expect(res.body.token.split(".")).toHaveLength(3); // JWT has 3 parts

    expect(res.body).toHaveProperty("user");
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user.username).toBe(TEST_USER.username);
    expect(res.body.user).not.toHaveProperty("hashedPassword"); // Must never leak hash
    expect(res.body.user).not.toHaveProperty("password");
    expect(res.body.user).toHaveProperty("id");
    expect(res.body.user).toHaveProperty("createdAt");
  });

  it("should return 409 on duplicate email", async () => {
    const res = await request(app).post("/api/auth/signup").send(TEST_USER);

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error", "Conflict");
    expect(res.body.message).toMatch(/email/i);
  });

  it("should return 409 on duplicate username (different email)", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ ...TEST_USER, email: "other@example.com" });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error", "Conflict");
    expect(res.body.message).toMatch(/username/i);
  });

  it("should return 422 when email is missing", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "noEmail", password: "Password123!" });

    expect(res.status).toBe(422);
    expect(res.body).toHaveProperty("error", "Validation Error");
  });

  it("should return 422 when password is too short (< 8 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "weakpass", email: "weak@example.com", password: "short" });

    expect(res.status).toBe(422);
    expect(res.body.message).toMatch(/8 characters/i);
  });

  it("should return 422 when username has special chars", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "bad user!", email: "bad@example.com", password: "Password123!" });

    expect(res.status).toBe(422);
  });

  it("should return 422 when email is malformed", async () => {
    const res = await request(app)
      .post("/api/auth/signup")
      .send({ username: "validuser", email: "not-an-email", password: "Password123!" });

    expect(res.status).toBe(422);
  });
});

describe("POST /api/auth/login", () => {
  beforeAll(async () => {
    // Ensure test user exists
    await cleanupTestUser();
    await request(app).post("/api/auth/signup").send(TEST_USER);
  });

  afterAll(async () => {
    await cleanupTestUser();
  });

  it("should return 200 with JWT on valid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: TEST_USER.password });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.token.split(".")).toHaveLength(3);
    expect(res.body.user.email).toBe(TEST_USER.email);
    expect(res.body.user).not.toHaveProperty("hashedPassword");
  });

  it("should return 401 on wrong password", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email, password: "WrongPassword!" });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Unauthorized");
    // Must NOT reveal whether the email exists
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it("should return 401 on unknown email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: TEST_USER.password });

    expect(res.status).toBe(401);
    expect(res.body.message).toMatch(/invalid email or password/i);
  });

  it("should return 422 when fields are missing", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_USER.email }); // no password

    expect(res.status).toBe(422);
  });
});

describe("GET /api/auth/me", () => {
  let validToken: string;

  beforeAll(async () => {
    await cleanupTestUser();
    const signupRes = await request(app).post("/api/auth/signup").send(TEST_USER);
    validToken = signupRes.body.token;
  });

  afterAll(async () => {
    await cleanupTestUser();
  });

  it("should return 200 with user profile for valid token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${validToken}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe(TEST_USER.email);
    expect(res.body.username).toBe(TEST_USER.username);
    expect(res.body).not.toHaveProperty("hashedPassword");
    expect(res.body).toHaveProperty("id");
  });

  it("should return 401 when no Authorization header", async () => {
    const res = await request(app).get("/api/auth/me");

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error", "Unauthorized");
  });

  it("should return 401 for a malformed token", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not.a.valid.jwt");

    expect(res.status).toBe(401);
  });

  it("should return 401 for a tampered token", async () => {
    const [header, , signature] = validToken.split(".");
    const tamperedToken = `${header}.eyJzdWIiOjk5OX0.${signature}`; // Changed payload

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${tamperedToken}`);

    expect(res.status).toBe(401);
  });

  it("should return 401 when Authorization header is missing Bearer prefix", async () => {
    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", validToken); // No "Bearer " prefix

    expect(res.status).toBe(401);
  });
});
