"""
FastAPI Integration Tests
=========================

Tests all /api/* endpoints with a real in-memory SQLite database.
Run with: pytest tests/ -v
"""
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from app.main import app
from app.database import Base
from app.core.dependencies import get_db

# Use SQLite for tests (no PostgreSQL required)
TEST_DATABASE_URL = "sqlite+aiosqlite:///./test.db"

test_engine = create_async_engine(TEST_DATABASE_URL, echo=False)
TestSessionLocal = async_sessionmaker(test_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def setup_db():
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def client():
    async def override_get_db():
        async with TestSessionLocal() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://test",
    ) as ac:
        yield ac

    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# Auth tests
# ---------------------------------------------------------------------------

TEST_USER = {
    "username": "testanalyst",
    "email": "analyst@dids.io",
    "password": "SecurePass123!",
}


@pytest.mark.asyncio
async def test_signup_success(client: AsyncClient):
    res = await client.post("/api/auth/signup", json=TEST_USER)
    assert res.status_code == 201
    data = res.json()
    assert "token" in data
    assert len(data["token"].split(".")) == 3
    assert data["user"]["email"] == TEST_USER["email"]
    assert "hashedPassword" not in data["user"]


@pytest.mark.asyncio
async def test_signup_duplicate_email(client: AsyncClient):
    # First signup
    await client.post("/api/auth/signup", json=TEST_USER)
    # Duplicate
    res = await client.post("/api/auth/signup", json=TEST_USER)
    assert res.status_code == 409


@pytest.mark.asyncio
async def test_signup_weak_password(client: AsyncClient):
    res = await client.post("/api/auth/signup", json={
        **TEST_USER, "email": "other@test.com", "password": "short"
    })
    assert res.status_code == 422


@pytest.mark.asyncio
async def test_login_success(client: AsyncClient):
    await client.post("/api/auth/signup", json=TEST_USER)
    res = await client.post("/api/auth/login", json={
        "email": TEST_USER["email"],
        "password": TEST_USER["password"],
    })
    assert res.status_code == 200
    assert "token" in res.json()


@pytest.mark.asyncio
async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/auth/signup", json=TEST_USER)
    res = await client.post("/api/auth/login", json={
        "email": TEST_USER["email"],
        "password": "WrongPassword!",
    })
    assert res.status_code == 401
    assert "Invalid email or password" in res.json()["detail"]["message"]


@pytest.mark.asyncio
async def test_get_me_authenticated(client: AsyncClient):
    signup = await client.post("/api/auth/signup", json={
        **TEST_USER, "email": "me@dids.io", "username": "meuser"
    })
    token = signup.json()["token"]
    res = await client.get(
        "/api/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    assert res.json()["email"] == "me@dids.io"


@pytest.mark.asyncio
async def test_get_me_no_token(client: AsyncClient):
    res = await client.get("/api/auth/me")
    assert res.status_code == 401  # HTTPBearer: 401 when no Authorization header


# ---------------------------------------------------------------------------
# Scan tests
# ---------------------------------------------------------------------------

async def get_token(client: AsyncClient, suffix: str = "") -> str:
    signup = await client.post("/api/auth/signup", json={
        "username": f"scanuser{suffix}",
        "email": f"scan{suffix}@dids.io",
        "password": "SecurePass123!",
    })
    return signup.json()["token"]


@pytest.mark.asyncio
async def test_scan_benign(client: AsyncClient):
    token = await get_token(client, "benign")
    res = await client.post("/api/scan", json={
        "sourceIp": "192.168.1.10",
        "destinationIp": "10.0.0.5",
        "protocol": "TCP",
        "data": "GET /index.html HTTP/1.1",
        "nodeId": "node-01",
        "bytesSent": 512,
    }, headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 200
    data = res.json()
    assert data["prediction"] in ("benign", "malicious")  # Model may vary
    assert "logId" in data
    assert 0 <= data["confidenceScore"] <= 1


@pytest.mark.asyncio
async def test_scan_sql_injection(client: AsyncClient):
    token = await get_token(client, "sql")
    res = await client.post("/api/scan", json={
        "sourceIp": "10.0.0.99",
        "destinationIp": "10.0.0.1",
        "protocol": "TCP",
        "data": "SELECT * FROM users UNION SELECT username,password FROM admins--",
        "nodeId": "node-02",
        "bytesSent": 1024,
    }, headers={"Authorization": f"Bearer {token}"})

    assert res.status_code == 200
    data = res.json()
    assert data["prediction"] == "malicious"
    assert data["threatType"] == "SQL Injection"
    assert data["alertId"] is not None
    assert data["confidenceScore"] >= 0.9


@pytest.mark.asyncio
async def test_scan_no_auth(client: AsyncClient):
    res = await client.post("/api/scan", json={
        "sourceIp": "1.2.3.4",
        "destinationIp": "5.6.7.8",
        "protocol": "TCP",
        "data": "test",
        "nodeId": "n1",
        "bytesSent": 100,
    })
    assert res.status_code == 401  # HTTPBearer: 401 when no Authorization header


# ---------------------------------------------------------------------------
# Logs tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_get_logs_paginated(client: AsyncClient):
    token = await get_token(client, "logs")
    res = await client.get(
        "/api/logs?page=1&pageSize=10",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert "logs" in data
    assert "total" in data
    assert data["page"] == 1
    assert data["pageSize"] == 10


@pytest.mark.asyncio
async def test_get_logs_invalid_status(client: AsyncClient):
    token = await get_token(client, "logsbad")
    res = await client.get(
        "/api/logs?status=invalid",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert res.status_code == 400


# ---------------------------------------------------------------------------
# Health test
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_healthz(client: AsyncClient):
    res = await client.get("/api/healthz")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
