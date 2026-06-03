/**
 * Test environment setup.
 *
 * Sets all required environment variables before any module is imported.
 * This must be loaded before app.ts so that JWT_SECRET and DATABASE_URL
 * are available when jwt.ts initializes.
 */

// IMPORTANT: These must be set before importing any app modules
process.env["JWT_SECRET"] = "test-secret-do-not-use-in-production";
process.env["DATABASE_URL"] = process.env["DATABASE_URL"] ?? "postgresql://postgres:postgres@localhost:5432/dids_test";
process.env["PORT"] = "0"; // Random port for tests
process.env["DIDS_API_KEY"] = ""; // Disable API key check in tests
