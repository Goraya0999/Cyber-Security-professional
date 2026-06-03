/**
 * Logs route test suite
 *
 * Tests GET /api/logs and GET /api/logs/recent with:
 * - Pagination and filtering
 * - Auth protection
 * - Response shape validation
 * - Edge cases
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import app from "../app";

const TEST_LOGS_USER = {
  username: "testuser_logs",
  email: "testlogs@example.com",
  password: "StrongPassword123!",
};

let authToken: string;

async function cleanupLogsUser() {
  await db.delete(usersTable).where(eq(usersTable.email, TEST_LOGS_USER.email));
}

beforeAll(async () => {
  await cleanupLogsUser();
  const res = await request(app).post("/api/auth/signup").send(TEST_LOGS_USER);
  authToken = res.body.token;
});

afterAll(async () => {
  await cleanupLogsUser();
});

describe("GET /api/logs", () => {
  describe("Authentication", () => {
    it("should return 401 without auth token", async () => {
      const res = await request(app).get("/api/logs");
      expect(res.status).toBe(401);
    });
  });

  describe("Response shape", () => {
    it("should return paginated response with correct shape", async () => {
      const res = await request(app)
        .get("/api/logs")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      // Validate pagination structure
      expect(res.body).toHaveProperty("logs");
      expect(res.body).toHaveProperty("total");
      expect(res.body).toHaveProperty("page");
      expect(res.body).toHaveProperty("pageSize");

      expect(Array.isArray(res.body.logs)).toBe(true);
      expect(typeof res.body.total).toBe("number");
      expect(typeof res.body.page).toBe("number");
      expect(typeof res.body.pageSize).toBe("number");
    });

    it("should return logs with correct fields", async () => {
      const res = await request(app)
        .get("/api/logs")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);

      if (res.body.logs.length > 0) {
        const log = res.body.logs[0];
        expect(log).toHaveProperty("id");
        expect(log).toHaveProperty("sourceIp");
        expect(log).toHaveProperty("destinationIp");
        expect(log).toHaveProperty("protocol");
        expect(log).toHaveProperty("status");
        expect(log).toHaveProperty("nodeId");
        expect(log).toHaveProperty("bytesSent");
        expect(log).toHaveProperty("confidenceScore");
        expect(log).toHaveProperty("timestamp");
        expect(["benign", "malicious"]).toContain(log.status);
      }
    });
  });

  describe("Query parameters", () => {
    it("should accept valid page and pageSize params", async () => {
      const res = await request(app)
        .get("/api/logs?page=1&pageSize=10")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(10);
      expect(res.body.logs.length).toBeLessThanOrEqual(10);
    });

    it("should filter by status=benign", async () => {
      const res = await request(app)
        .get("/api/logs?status=benign")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const allBenign = res.body.logs.every((l: { status: string }) => l.status === "benign");
      expect(allBenign).toBe(true);
    });

    it("should filter by status=malicious", async () => {
      const res = await request(app)
        .get("/api/logs?status=malicious")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      const allMalicious = res.body.logs.every(
        (l: { status: string }) => l.status === "malicious"
      );
      expect(allMalicious).toBe(true);
    });

    it("should return 400 for invalid status value", async () => {
      const res = await request(app)
        .get("/api/logs?status=invalid")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(400);
    });

    it("should support search query parameter", async () => {
      const res = await request(app)
        .get("/api/logs?search=192.168")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("logs");
      expect(Array.isArray(res.body.logs)).toBe(true);
    });

    it("should default to page=1 and pageSize=50", async () => {
      const res = await request(app)
        .get("/api/logs")
        .set("Authorization", `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.page).toBe(1);
      expect(res.body.pageSize).toBe(50);
    });
  });
});

describe("GET /api/logs/recent", () => {
  it("should return 401 without auth token", async () => {
    const res = await request(app).get("/api/logs/recent");
    expect(res.status).toBe(401);
  });

  it("should return an array of recent logs", async () => {
    const res = await request(app)
      .get("/api/logs/recent")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("should respect the limit query param", async () => {
    const res = await request(app)
      .get("/api/logs/recent?limit=5")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBeLessThanOrEqual(5);
  });

  it("should return logs sorted by most recent first", async () => {
    const res = await request(app)
      .get("/api/logs/recent?limit=10")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);

    if (res.body.length >= 2) {
      const timestamps = res.body.map((l: { timestamp: string }) => new Date(l.timestamp).getTime());
      const isSorted = timestamps.every(
        (ts: number, i: number) => i === 0 || timestamps[i - 1] >= ts
      );
      expect(isSorted).toBe(true);
    }
  });
});
