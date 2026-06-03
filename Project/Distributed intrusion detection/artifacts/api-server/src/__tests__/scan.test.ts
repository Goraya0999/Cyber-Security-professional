/**
 * Scan route test suite
 *
 * Tests the POST /api/scan endpoint for:
 * - Valid benign traffic
 * - Malicious payload detection
 * - Missing required fields
 * - Unauthorized access (no JWT)
 */
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import app from "../app";

const TEST_SCAN_USER = {
  username: "testuser_scan",
  email: "testscan@example.com",
  password: "StrongPassword123!",
};

let authToken: string;

async function cleanupScanUser() {
  await db.delete(usersTable).where(eq(usersTable.email, TEST_SCAN_USER.email));
}

beforeAll(async () => {
  await cleanupScanUser();
  const res = await request(app).post("/api/auth/signup").send(TEST_SCAN_USER);
  authToken = res.body.token;
});

afterAll(async () => {
  await cleanupScanUser();
});

afterEach(() => {
  delete process.env["DIDS_ML_API_URL"];
  delete process.env["DIDS_ML_API_KEY"];
  delete process.env["DIDS_ML_API_TOKEN"];
  delete process.env["DIDS_ML_TIMEOUT_MS"];
  vi.unstubAllGlobals();
});

const VALID_BENIGN_PAYLOAD = {
  sourceIp: "192.168.1.10",
  destinationIp: "10.0.0.5",
  protocol: "TCP",
  data: "GET /index.html HTTP/1.1 Host: example.com",
  nodeId: "node-test-01",
  bytesSent: 512,
};

const VALID_MALICIOUS_PAYLOAD = {
  sourceIp: "45.33.32.156",
  destinationIp: "10.0.0.5",
  protocol: "TCP",
  data: "SYN flood attack detected 4500 pkts/s overwhelming target",
  nodeId: "node-test-01",
  bytesSent: 99000,
};

describe("POST /api/scan", () => {
  describe("Authentication", () => {
    it("should return 401 without a JWT token", async () => {
      const res = await request(app)
        .post("/api/scan")
        .send(VALID_BENIGN_PAYLOAD);

      expect(res.status).toBe(401);
      expect(res.body).toHaveProperty("error", "Unauthorized");
    });
  });

  describe("Input validation", () => {
    it("should return 400 when sourceIp is missing", async () => {
      const { sourceIp: _removed, ...incomplete } = VALID_BENIGN_PAYLOAD;
      const res = await request(app)
        .post("/api/scan")
        .set("Authorization", `Bearer ${authToken}`)
        .send(incomplete);

      expect(res.status).toBe(400);
    });

    it("should return 400 when protocol is missing", async () => {
      const { protocol: _removed, ...incomplete } = VALID_BENIGN_PAYLOAD;
      const res = await request(app)
        .post("/api/scan")
        .set("Authorization", `Bearer ${authToken}`)
        .send(incomplete);

      expect(res.status).toBe(400);
    });

    it("should return 400 when body is empty", async () => {
      const res = await request(app)
        .post("/api/scan")
        .set("Authorization", `Bearer ${authToken}`)
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe("Detection logic", () => {
    it("should classify benign traffic correctly", async () => {
      const res = await request(app)
        .post("/api/scan")
        .set("Authorization", `Bearer ${authToken}`)
        .send(VALID_BENIGN_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.prediction).toBe("benign");
      expect(res.body).toHaveProperty("logId");
      expect(typeof res.body.logId).toBe("number");
      expect(res.body).toHaveProperty("confidenceScore");
      expect(res.body.confidenceScore).toBeGreaterThan(0);
      expect(res.body.confidenceScore).toBeLessThanOrEqual(1);
      expect(res.body.alertId).toBeNull();
      expect(res.body).toHaveProperty("message");
    });

    it("should use the configured FastAPI ML service when available", async () => {
      process.env["DIDS_ML_API_URL"] = "http://ml-api.local";
      process.env["DIDS_ML_API_KEY"] = "test-ml-key";
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          logId: 123,
          prediction: "malicious",
          confidenceScore: 0.991,
          threatType: "DDoS",
          alertId: 456,
          message: "Threat detected: DDoS",
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const res = await request(app)
        .post("/api/scan")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ...VALID_BENIGN_PAYLOAD,
          data: "Ambiguous high-volume traffic sample",
        });

      expect(res.status).toBe(200);
      expect(fetchMock).toHaveBeenCalledWith(
        "http://ml-api.local/api/scan",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "X-Internal-API-Key": "test-ml-key",
          }),
        }),
      );
      expect(res.body.prediction).toBe("malicious");
      expect(res.body.threatType).toBe("DDoS");
      expect(res.body.confidenceScore).toBe(0.991);
      expect(res.body.alertId).toBeTypeOf("number");
    });

    it("should fall back to local detection if the ML service is unavailable", async () => {
      process.env["DIDS_ML_API_URL"] = "http://ml-api.local";
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("connection refused")));

      const res = await request(app)
        .post("/api/scan")
        .set("Authorization", `Bearer ${authToken}`)
        .send(VALID_MALICIOUS_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.prediction).toBe("malicious");
      expect(res.body.threatType).toContain("SYN Flood");
    });

    it("should detect malicious traffic and create an alert", async () => {
      const res = await request(app)
        .post("/api/scan")
        .set("Authorization", `Bearer ${authToken}`)
        .send(VALID_MALICIOUS_PAYLOAD);

      expect(res.status).toBe(200);
      expect(res.body.prediction).toBe("malicious");
      expect(res.body.alertId).toBeTypeOf("number"); // Alert auto-created
      expect(res.body.threatType).toContain("SYN Flood");
      expect(res.body.confidenceScore).toBeGreaterThan(0.5);
      expect(res.body.message).toMatch(/threat detected/i);
    });

    it("should detect SQL injection pattern", async () => {
      const res = await request(app)
        .post("/api/scan")
        .set("Authorization", `Bearer ${authToken}`)
        .send({
          ...VALID_BENIGN_PAYLOAD,
          data: "SELECT * FROM users WHERE id=1 UNION SELECT username,password FROM admins--",
        });

      expect(res.status).toBe(200);
      expect(res.body.prediction).toBe("malicious");
      expect(res.body.threatType).toMatch(/SQL Injection/i);
    });

    it("should have correct response shape", async () => {
      const res = await request(app)
        .post("/api/scan")
        .set("Authorization", `Bearer ${authToken}`)
        .send(VALID_BENIGN_PAYLOAD);

      expect(res.status).toBe(200);
      const { logId, prediction, confidenceScore, threatType, alertId, message } = res.body;
      // All required fields must be present
      expect(logId).toBeDefined();
      expect(prediction).toMatch(/^(benign|malicious)$/);
      expect(confidenceScore).toBeDefined();
      expect("threatType" in res.body).toBe(true); // Can be null
      expect("alertId" in res.body).toBe(true); // Can be null
      expect(message).toBeDefined();
    });
  });
});

describe("POST /api/scan/packet", () => {
  it("should normalize tcpdump-style packet text and run detection", async () => {
    const res = await request(app)
      .post("/api/scan/packet")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        nodeId: "edge-node-01",
        rawPacket: "IP 45.33.32.156.44321 > 10.0.0.5.80: Flags [S], SYN flood attack length 99000",
      });

    expect(res.status).toBe(200);
    expect(res.body.prediction).toBe("malicious");
    expect(res.body.threatType).toContain("SYN Flood");
    expect(res.body.alertId).toBeTypeOf("number");
  });

  it("should normalize structured packet metadata and run detection", async () => {
    const res = await request(app)
      .post("/api/scan/packet")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        packet: {
          sourceIp: "192.168.1.10",
          destinationIp: "10.0.0.5",
          protocol: "tcp",
          nodeId: "sensor-02",
          sourcePort: 49152,
          destinationPort: 80,
          flags: ["ack", "psh"],
          payload: "GET /index.html HTTP/1.1 Host: example.com",
          bytesSent: 512,
        },
      });

    expect(res.status).toBe(200);
    expect(res.body.prediction).toBe("benign");
    expect(res.body.alertId).toBeNull();
  });

  it("should reject unparseable packet input", async () => {
    const res = await request(app)
      .post("/api/scan/packet")
      .set("Authorization", `Bearer ${authToken}`)
      .send({ rawPacket: "not a packet" });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/tcpdump/i);
  });
});
