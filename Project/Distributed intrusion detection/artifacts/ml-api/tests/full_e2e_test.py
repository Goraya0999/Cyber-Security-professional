"""
DIDS Full End-to-End Test Suite
================================

Boots the FastAPI server with SQLite, runs every API endpoint,
tests all ML attack scenarios, validates responses, and prints a
detailed summary report.

Usage:
    python tests/full_e2e_test.py
"""

import asyncio
import json
import time
import sys
import os
from pathlib import Path
from datetime import datetime

# â”€â”€ ensure app is importable â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
sys.path.insert(0, str(Path(__file__).parent.parent))
os.environ.setdefault("DATABASE_URL", "sqlite+aiosqlite:///./e2e_test.db")
os.environ.setdefault("JWT_SECRET",   "e2e-test-secret-key-at-least-32-chars!!")

from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.database import Base
from app.core.dependencies import get_db

# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

TEST_DB_URL = "sqlite+aiosqlite:///./e2e_test.db"
test_engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession  = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)

PASS = "[PASS]"
FAIL = "[FAIL]"
INFO = "[INFO]"
SEP  = "â”€" * 62


class TestResult:
    def __init__(self, name: str):
        self.name    = name
        self.passed  = 0
        self.failed  = 0
        self.errors: list[str] = []

    def ok(self, label: str):
        self.passed += 1
        print(f"  {PASS}  {label}")

    def err(self, label: str, detail: str = ""):
        self.failed += 1
        msg = f"  {FAIL}  {label}"
        if detail:
            msg += f"\n         {detail}"
        print(msg)
        self.errors.append(f"{label}: {detail}")


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Helpers
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

def assert_ok(r: TestResult, label: str, condition: bool, detail: str = ""):
    if condition:
        r.ok(label)
    else:
        r.err(label, detail)


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Test Sections
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async def test_health(client: AsyncClient) -> TestResult:
    r = TestResult("Health Check")
    print(f"\n{SEP}\n  Health Check\n{SEP}")

    res = await client.get("/api/healthz")
    assert_ok(r, "GET /api/healthz returns 200",   res.status_code == 200)
    assert_ok(r, "Response has status=ok",         res.json().get("status") == "ok")
    assert_ok(r, "Response has service field",     "service" in res.json())
    return r


async def test_auth(client: AsyncClient) -> tuple[TestResult, str, dict]:
    r = TestResult("Authentication")
    print(f"\n{SEP}\n  Authentication\n{SEP}")

    # â”€â”€ Signup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    user = {"username": "analyst01", "email": "analyst@dids.io", "password": "StrongPass99!"}
    res = await client.post("/api/auth/signup", json=user)
    assert_ok(r, "POST /api/auth/signup â†’ 201",         res.status_code == 201,
              f"Got {res.status_code}: {res.text[:120]}")
    data = res.json() if res.status_code == 201 else {}
    assert_ok(r, "Response contains JWT token",         "token" in data)
    assert_ok(r, "Token is 3-part JWT",                 len(data.get("token", "").split(".")) == 3)
    assert_ok(r, "Response contains user object",       "user" in data)
    assert_ok(r, "User email matches",                  data.get("user", {}).get("email") == user["email"])
    assert_ok(r, "Password not leaked in response",     "password" not in json.dumps(data).lower() or
                                                        "hashed_password" not in json.dumps(data))
    assert_ok(r, "User has id field",                   "id" in data.get("user", {}))
    assert_ok(r, "User has created_at field",           "created_at" in data.get("user", {}))

    # â”€â”€ Duplicate signup â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    dup = await client.post("/api/auth/signup", json=user)
    assert_ok(r, "Duplicate email â†’ 409 Conflict",      dup.status_code == 409)

    # â”€â”€ Weak password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    weak = await client.post("/api/auth/signup", json={**user, "email": "newuser@example.io", "password": "abc"})
    assert_ok(r, "Weak password â†’ 422 Validation",      weak.status_code == 422)

    # â”€â”€ Invalid email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    bad_email = await client.post("/api/auth/signup", json={**user, "email": "not-an-email"})
    assert_ok(r, "Invalid email â†’ 422 Validation",      bad_email.status_code == 422)

    # â”€â”€ Login success â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    login_res = await client.post("/api/auth/login", json={"email": user["email"], "password": user["password"]})
    assert_ok(r, "POST /api/auth/login â†’ 200",          login_res.status_code == 200)
    login_data = login_res.json() if login_res.status_code == 200 else {}
    assert_ok(r, "Login returns fresh token",           "token" in login_data)

    token = data.get("token", login_data.get("token", ""))

    # â”€â”€ Wrong password â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    bad_pass = await client.post("/api/auth/login", json={"email": user["email"], "password": "Wrong123!"})
    assert_ok(r, "Wrong password â†’ 401",                bad_pass.status_code == 401)
    assert_ok(r, "401 has descriptive message",         "Invalid" in str(bad_pass.json()))

    # â”€â”€ Unknown email â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    unknown = await client.post("/api/auth/login", json={"email": "nobody@dids.io", "password": "abc123!!"})
    assert_ok(r, "Unknown email â†’ 401",                 unknown.status_code == 401)

    # â”€â”€ GET /auth/me â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    me_res = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert_ok(r, "GET /api/auth/me â†’ 200",              me_res.status_code == 200)
    assert_ok(r, "/me returns correct email",           me_res.json().get("email") == user["email"])

    # â”€â”€ No token â†’ 401 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    no_tok = await client.get("/api/auth/me")
    assert_ok(r, "No token â†’ 401",                      no_tok.status_code == 401)

    # â”€â”€ Tampered token â†’ 401 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    tampered = token[:-5] + "XXXXX"
    bad_tok = await client.get("/api/auth/me", headers={"Authorization": f"Bearer {tampered}"})
    assert_ok(r, "Tampered token â†’ 401",                bad_tok.status_code == 401)

    return r, token, user


async def test_scan_ml(client: AsyncClient, token: str) -> TestResult:
    r = TestResult("ML Scan")
    print(f"\n{SEP}\n  ML Scan â€” Attack Detection\n{SEP}")
    hdrs = {"Authorization": f"Bearer {token}"}

    # â”€â”€ Auth guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    no_auth = await client.post("/api/scan", json={
        "sourceIp": "1.1.1.1", "destinationIp": "2.2.2.2",
        "protocol": "TCP", "data": "test", "nodeId": "n0", "bytesSent": 100,
    })
    assert_ok(r, "No auth â†’ 401",                       no_auth.status_code == 401)

    # Helper for scanning
    async def scan(label, payload, expect_malicious=None, expect_threat=None,
                   expect_alert=None, expect_confidence_min=0.5):
        res = await client.post("/api/scan", json=payload, headers=hdrs)
        assert_ok(r, f"{label} â†’ 200",                  res.status_code == 200,
                  f"Got {res.status_code}: {res.text[:120]}")
        if res.status_code != 200:
            return None
        d = res.json()
        assert_ok(r, f"{label}: has logId",              "logId" in d and d["logId"] > 0)
        assert_ok(r, f"{label}: has prediction",         d.get("prediction") in ("benign", "malicious"))
        assert_ok(r, f"{label}: confidence in [0,1]",    0 <= d.get("confidenceScore", -1) <= 1)
        if expect_malicious is not None:
            pred = d.get("prediction")
            assert_ok(r, f"{label}: prediction={('malicious' if expect_malicious else 'benign')}",
                      pred == ("malicious" if expect_malicious else "benign"),
                      f"Got prediction={pred!r}")
        if expect_threat is not None:
            t = d.get("threatType")
            assert_ok(r, f"{label}: threatType={expect_threat!r}",
                      t == expect_threat, f"Got threatType={t!r}")
        if expect_alert is True:
            assert_ok(r, f"{label}: alert created",      d.get("alertId") is not None)
        if expect_alert is False:
            assert_ok(r, f"{label}: no alert",           d.get("alertId") is None)
        assert_ok(r, f"{label}: confidence â‰¥ {expect_confidence_min}",
                  d.get("confidenceScore", 0) >= expect_confidence_min)
        return d

    # â”€â”€ Benign traffic â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("Normal HTTP request",
               {"sourceIp": "192.168.1.50", "destinationIp": "10.0.0.1",
                "protocol": "TCP", "data": "GET /index.html HTTP/1.1\r\nHost: example.com",
                "nodeId": "node-01", "bytesSent": 1024},
               expect_alert=False)

    # â”€â”€ SQL Injection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("SQL Injection (UNION SELECT)",
               {"sourceIp": "45.33.32.156", "destinationIp": "10.0.0.1",
                "protocol": "TCP",
                "data": "GET /login?id=1 UNION SELECT username,password FROM users--",
                "nodeId": "node-02", "bytesSent": 512},
               expect_malicious=True, expect_threat="SQL Injection",
               expect_alert=True, expect_confidence_min=0.95)

    # â”€â”€ SQL Injection variant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("SQL Injection (DROP TABLE)",
               {"sourceIp": "192.168.99.1", "destinationIp": "10.0.0.2",
                "protocol": "TCP", "data": "'; DROP TABLE users; --",
                "nodeId": "node-03", "bytesSent": 256},
               expect_malicious=True, expect_threat="SQL Injection",
               expect_alert=True)

    # â”€â”€ XSS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("XSS Attack (<script>)",
               {"sourceIp": "172.16.99.1", "destinationIp": "10.0.0.3",
                "protocol": "TCP",
                "data": "GET /search?q=<script>alert('xss')</script>",
                "nodeId": "node-04", "bytesSent": 300},
               expect_malicious=True, expect_threat="XSS",
               expect_alert=True, expect_confidence_min=0.90)

    # â”€â”€ Command Injection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("Command Injection (pipe shell)",
               {"sourceIp": "10.0.99.99", "destinationIp": "10.0.0.4",
                "protocol": "TCP",
                "data": "filename=test.txt | rm -rf /",
                "nodeId": "node-05", "bytesSent": 200},
               expect_malicious=True, expect_threat="Command Injection",
               expect_alert=True, expect_confidence_min=0.90)

    # â”€â”€ DoS Hulk (keyword) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("DoS Hulk keyword",
               {"sourceIp": "203.0.113.5", "destinationIp": "10.0.0.1",
                "protocol": "TCP",
                "data": "SYN flood attack high-rate packets",
                "nodeId": "node-01", "bytesSent": 99000},
               expect_malicious=True, expect_alert=True, expect_confidence_min=0.0)

    # â”€â”€ Port Scan â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("Port Scan (nmap keyword)",
               {"sourceIp": "45.33.32.156", "destinationIp": "10.0.0.5",
                "protocol": "TCP", "data": "nmap port scan SYN probe",
                "nodeId": "node-06", "bytesSent": 44},
               expect_malicious=True, expect_alert=True, expect_confidence_min=0.0)

    # â”€â”€ SSH Brute Force â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("SSH Brute Force (patator keyword)",
               {"sourceIp": "198.51.100.1", "destinationIp": "10.0.0.22",
                "protocol": "TCP", "data": "SSH patator brute force login attempt",
                "nodeId": "node-07", "bytesSent": 200},
               expect_malicious=True, expect_alert=True, expect_confidence_min=0.0)

    # â”€â”€ DDoS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("DDoS (flood keyword)",
               {"sourceIp": "1.2.3.4", "destinationIp": "10.0.0.1",
                "protocol": "UDP", "data": "ddos flood amplification attack",
                "nodeId": "node-01", "bytesSent": 128000},
               expect_malicious=True, expect_alert=True, expect_confidence_min=0.0)

    # â”€â”€ UDP benign â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("Normal UDP DNS query",
               {"sourceIp": "192.168.1.1", "destinationIp": "8.8.8.8",
                "protocol": "UDP", "data": "DNS query A example.com",
                "nodeId": "node-08", "bytesSent": 64},
               expect_confidence_min=0.0)

    # â”€â”€ Very large bytesSent â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    await scan("Large bytes, suspicious IP",
               {"sourceIp": "45.33.32.156", "destinationIp": "10.0.0.1",
                "protocol": "TCP", "data": "bulk data transfer",
                "nodeId": "node-01", "bytesSent": 500000})

    return r


async def test_logs(client: AsyncClient, token: str) -> TestResult:
    r = TestResult("Logs API")
    print(f"\n{SEP}\n  Logs API\n{SEP}")
    hdrs = {"Authorization": f"Bearer {token}"}

    # â”€â”€ Basic list â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    res = await client.get("/api/logs", headers=hdrs)
    assert_ok(r, "GET /api/logs â†’ 200",                  res.status_code == 200)
    d = res.json()
    assert_ok(r, "Response has 'logs' list",              isinstance(d.get("logs"), list))
    assert_ok(r, "Response has 'total' count",            isinstance(d.get("total"), int))
    assert_ok(r, "Response has 'page' field",             d.get("page") == 1)
    assert_ok(r, "Response has 'pageSize' field",         "pageSize" in d)
    assert_ok(r, "Scans are recorded (total > 0)",        d.get("total", 0) > 0,
              f"total={d.get('total')}")

    if d.get("logs"):
        log = d["logs"][0]
        assert_ok(r, "Log has required fields",           all(k in log for k in
                  ["id","sourceIp","destinationIp","protocol","status","confidenceScore","timestamp"]))
        assert_ok(r, "Log status is benign|malicious",    log.get("status") in ("benign","malicious"))
        assert_ok(r, "Confidence score in [0,1]",         0 <= log.get("confidenceScore", -1) <= 1)

    # â”€â”€ Pagination â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    p1 = await client.get("/api/logs?page=1&pageSize=3", headers=hdrs)
    assert_ok(r, "Pagination page=1 â†’ 200",               p1.status_code == 200)
    assert_ok(r, "pageSize=3 respected",                  len(p1.json().get("logs", [])) <= 3)

    p2 = await client.get("/api/logs?page=2&pageSize=3", headers=hdrs)
    assert_ok(r, "Pagination page=2 â†’ 200",               p2.status_code == 200)

    # â”€â”€ Status filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    mal = await client.get("/api/logs?status=malicious", headers=hdrs)
    assert_ok(r, "Filter status=malicious â†’ 200",         mal.status_code == 200)
    for log in mal.json().get("logs", []):
        assert_ok(r, f"  Log {log['id']} is malicious",  log["status"] == "malicious")

    ben = await client.get("/api/logs?status=benign", headers=hdrs)
    assert_ok(r, "Filter status=benign â†’ 200",            ben.status_code == 200)
    for log in ben.json().get("logs", []):
        assert_ok(r, f"  Log {log['id']} is benign",     log["status"] == "benign")

    # â”€â”€ Search â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    s = await client.get("/api/logs?search=192.168", headers=hdrs)
    assert_ok(r, "Search by IP â†’ 200",                    s.status_code == 200)

    # â”€â”€ Invalid status â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    inv = await client.get("/api/logs?status=invalid", headers=hdrs)
    assert_ok(r, "Invalid status â†’ 400",                  inv.status_code == 400)

    # â”€â”€ Recent endpoint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    rec = await client.get("/api/logs/recent?limit=5", headers=hdrs)
    assert_ok(r, "GET /api/logs/recent â†’ 200",            rec.status_code == 200)
    assert_ok(r, "Recent returns list",                   isinstance(rec.json(), list))
    assert_ok(r, "Recent limit=5 respected",              len(rec.json()) <= 5)

    # â”€â”€ No auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    na = await client.get("/api/logs")
    assert_ok(r, "No auth â†’ 401",                         na.status_code == 401)

    return r


async def test_alerts(client: AsyncClient, token: str) -> TestResult:
    r = TestResult("Alerts API")
    print(f"\n{SEP}\n  Alerts API\n{SEP}")
    hdrs = {"Authorization": f"Bearer {token}"}

    # â”€â”€ List all â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    res = await client.get("/api/alerts", headers=hdrs)
    assert_ok(r, "GET /api/alerts â†’ 200",                 res.status_code == 200)
    alerts = res.json()
    assert_ok(r, "Alerts is a list",                      isinstance(alerts, list))
    assert_ok(r, "Has alerts from scan tests",            len(alerts) > 0,
              f"Got {len(alerts)} alerts")

    # Validate alert schema
    if alerts:
        a = alerts[0]
        assert_ok(r, "Alert has required fields",         all(k in a for k in
                  ["id","logId","title","description","severity","sourceIp","nodeId","resolved","timestamp"]))
        assert_ok(r, "Alert severity is valid",           a.get("severity") in
                  ("critical","high","medium","low"))
        assert_ok(r, "Alert resolved is boolean",         isinstance(a.get("resolved"), bool))

    # â”€â”€ Severity filter â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    for sev in ("critical", "high", "medium", "low"):
        sv = await client.get(f"/api/alerts?severity={sev}", headers=hdrs)
        assert_ok(r, f"Filter severity={sev} â†’ 200",     sv.status_code == 200)
        for al in sv.json():
            assert_ok(r, f"  Alert matches {sev}",       al["severity"] == sev)

    # â”€â”€ Resolve alert â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    if alerts:
        first_id = alerts[-1]["id"]  # pick an unresolved one
        if not alerts[-1]["resolved"]:
            resolve = await client.patch(f"/api/alerts/{first_id}/resolve", headers=hdrs)
            assert_ok(r, f"PATCH /alerts/{first_id}/resolve â†’ 200", resolve.status_code == 200)
            assert_ok(r, "Resolved alert has resolved=True", resolve.json().get("resolved") is True)

            # Verify it persists
            recheck = await client.get("/api/alerts", headers=hdrs)
            resolved_ids = {a["id"] for a in recheck.json() if a["resolved"]}
            assert_ok(r, "Resolved state persists in DB", first_id in resolved_ids)

    # â”€â”€ Non-existent alert â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    nf = await client.patch("/api/alerts/999999/resolve", headers=hdrs)
    assert_ok(r, "Non-existent alert â†’ 404",              nf.status_code == 404)

    # â”€â”€ No auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    na = await client.get("/api/alerts")
    assert_ok(r, "No auth â†’ 401",                         na.status_code == 401)

    return r


async def test_analytics(client: AsyncClient, token: str) -> TestResult:
    r = TestResult("Analytics API")
    print(f"\n{SEP}\n  Analytics & Summary API\n{SEP}")
    hdrs = {"Authorization": f"Bearer {token}"}

    # â”€â”€ Analytics â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    res = await client.get("/api/analytics", headers=hdrs)
    assert_ok(r, "GET /api/analytics â†’ 200",              res.status_code == 200)
    d = res.json()
    assert_ok(r, "Has timeSeries",                        isinstance(d.get("timeSeries"), list))
    assert_ok(r, "timeSeries has 24 hourly buckets",      len(d.get("timeSeries", [])) == 24)
    assert_ok(r, "Has threatDistribution",                isinstance(d.get("threatDistribution"), list))
    assert_ok(r, "Has topSourceIps",                      isinstance(d.get("topSourceIps"), list))

    if d.get("timeSeries"):
        point = d["timeSeries"][0]
        assert_ok(r, "TimeSeries point has timestamp",    "timestamp" in point)
        assert_ok(r, "TimeSeries point has benign",       "benign" in point)
        assert_ok(r, "TimeSeries point has malicious",    "malicious" in point)

    if d.get("threatDistribution"):
        td = d["threatDistribution"][0]
        assert_ok(r, "ThreatDist has threatType",         "threatType" in td)
        assert_ok(r, "ThreatDist has count",              "count" in td and td["count"] > 0)

    # â”€â”€ Summary â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    sum_res = await client.get("/api/summary", headers=hdrs)
    assert_ok(r, "GET /api/summary â†’ 200",                sum_res.status_code == 200)
    s = sum_res.json()
    assert_ok(r, "Summary has totalScans",                isinstance(s.get("totalScans"), int))
    assert_ok(r, "Summary has maliciousCount",            isinstance(s.get("maliciousCount"), int))
    assert_ok(r, "Summary has benignCount",               isinstance(s.get("benignCount"), int))
    assert_ok(r, "Summary has unresolvedAlerts",          isinstance(s.get("unresolvedAlerts"), int))
    assert_ok(r, "Summary has detectionRate",             isinstance(s.get("detectionRate"), (int, float)))
    assert_ok(r, "totalScans > 0",                        s.get("totalScans", 0) > 0)
    assert_ok(r, "maliciousCount > 0",                    s.get("maliciousCount", 0) > 0)
    total = s.get("totalScans", 0)
    mal = s.get("maliciousCount", 0)
    ben = s.get("benignCount", 0)
    assert_ok(r, "malicious + benign = total",            mal + ben == total,
              f"{mal} + {ben} != {total}")
    assert_ok(r, "detectionRate in [0,1]",                0 <= s.get("detectionRate", -1) <= 1)

    # â”€â”€ No auth â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    na_a = await client.get("/api/analytics")
    na_s = await client.get("/api/summary")
    assert_ok(r, "Analytics no auth â†’ 401",               na_a.status_code == 401)
    assert_ok(r, "Summary no auth â†’ 401",                 na_s.status_code == 401)

    return r


async def test_ml_model(client: AsyncClient, token: str) -> TestResult:
    r = TestResult("ML Model Verification")
    print(f"\n{SEP}\n  ML Model â€” Direct Prediction Verification\n{SEP}")
    hdrs = {"Authorization": f"Bearer {token}"}

    from app.services.detection_service import DetectionService

    assert_ok(r, "Model is loaded",                      DetectionService._clf is not None,
              "Model not loaded â€” run 'python ml/train_model.py' first")

    if DetectionService._clf is None:
        return r

    assert_ok(r, "Scaler is loaded",                     DetectionService._scaler is not None)
    assert_ok(r, "Label encoder is loaded",              DetectionService._le is not None)
    assert_ok(r, "Feature names loaded (78-79)",     len(DetectionService._feature_names) >= 78,
              f"Got {len(DetectionService._feature_names)} features")

    classes = list(DetectionService._le.classes_)
    assert_ok(r, "Has 7 classes",                        len(classes) == 7,
              f"Got {len(classes)}: {classes}")

    expected_classes = {"BENIGN","DoS Hulk","DDoS","DoS GoldenEye","PortScan","FTP-Patator","SSH-Patator"}
    assert_ok(r, "All expected classes present",         set(classes) == expected_classes,
              f"Missing: {expected_classes - set(classes)}")

    # Direct inference tests
    direct_cases = [
        ("Normal web traffic",       "192.168.1.1", "10.0.0.1", "TCP",  "GET /page.html",          1024),
        ("High-rate SYN flood",      "1.2.3.4",     "10.0.0.1", "TCP",  "SYN flood",               99000),
        ("Port scanner SYN probe",   "5.5.5.5",     "10.0.0.5", "TCP",  "nmap port scan",          44),
        ("UDP flood DDoS",           "9.9.9.9",     "10.0.0.1", "UDP",  "ddos flood",              128000),
        ("FTP brute patator",        "6.6.6.6",     "10.0.0.21","TCP",  "FTP patator brute force", 500),
        ("SSH brute force",          "7.7.7.7",     "10.0.0.22","TCP",  "SSH patator attack",      200),
    ]

    for label, src, dst, proto, data, bsent in direct_cases:
        result = DetectionService.predict(src, dst, proto, data, bsent)
        assert_ok(r, f"Direct predict [{label}]: has prediction",
                  result.prediction in ("benign","malicious"))
        assert_ok(r, f"Direct predict [{label}]: confidence in [0,1]",
                  0 <= result.confidence_score <= 1)
        print(f"        => {result.prediction:9s} | {result.threat_type or 'BENIGN':20s} | conf={result.confidence_score:.3f}")

    return r


# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
# Main runner
# â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

async def main():
    print(f"\n{'â•'*62}")
    print(f"  DIDS Full End-to-End Test Suite")
    print(f"  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"{'â•'*62}")

    # Set up DB
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Load ML model explicitly (startup event doesn't fire in test mode)
    from app.services.detection_service import DetectionService
    DetectionService.load_model()

    async def override_db():
        async with TestSession() as session:
            yield session

    app.dependency_overrides[get_db] = override_db

    t_start = time.time()
    all_results: list[TestResult] = []

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://testserver") as client:
        # 1. Health
        rh = await test_health(client)
        all_results.append(rh)

        # 2. Auth (returns token for protected endpoints)
        ra, token, _ = await test_auth(client)
        all_results.append(ra)

        if not token:
            print("\n[FAIL] Cannot continue â€” no auth token obtained.")
            return

        # 3. ML Scans (creates logs + alerts)
        rs = await test_scan_ml(client, token)
        all_results.append(rs)

        # 4. Logs
        rl = await test_logs(client, token)
        all_results.append(rl)

        # 5. Alerts
        ra2 = await test_alerts(client, token)
        all_results.append(ra2)

        # 6. Analytics + Summary
        ran = await test_analytics(client, token)
        all_results.append(ran)

        # 7. ML model internals
        rm = await test_ml_model(client, token)
        all_results.append(rm)

    elapsed = time.time() - t_start

    # â”€â”€ Final Report â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    total_pass = sum(r.passed for r in all_results)
    total_fail = sum(r.failed for r in all_results)
    total      = total_pass + total_fail

    print(f"\n{'â•'*62}")
    print(f"  FINAL RESULTS")
    print(f"{'â•'*62}")
    print(f"  {'Section':<30} {'Pass':>6} {'Fail':>6}")
    print(f"  {'â”€'*30} {'â”€â”€â”€â”€â”€â”€':>6} {'â”€â”€â”€â”€â”€â”€':>6}")
    for res in all_results:
        t = res.passed + res.failed
        status = PASS if res.failed == 0 else FAIL
        print(f"  {status} {res.name:<28} {res.passed:>6} {res.failed:>6}")

    print(f"  {'â”€'*30} {'â”€â”€â”€â”€â”€â”€':>6} {'â”€â”€â”€â”€â”€â”€':>6}")
    print(f"  {'TOTAL':<30} {total_pass:>6} {total_fail:>6}")
    print(f"\n  Elapsed: {elapsed:.2f}s")
    print(f"  Result : {'ALL PASSED' if total_fail == 0 else f'{total_fail} FAILED'}")

    if total_fail > 0:
        print(f"\n  Failed assertions:")
        for res in all_results:
            for err in res.errors:
                print(f"    - [{res.name}] {err}")

    print(f"{'â•'*62}\n")

    # Cleanup
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    Path("./e2e_test.db").unlink(missing_ok=True)

    return total_fail


if __name__ == "__main__":
    fails = asyncio.run(main())
    sys.exit(0 if not fails else 1)


