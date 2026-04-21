import assert from "node:assert/strict";
import { afterEach, beforeEach, describe, test } from "node:test";
import { scryptSync } from "node:crypto";
import {
  createAdminSessionToken,
  isAdminAuthConfigured,
  validateAdminCredentials,
  verifyAdminSessionToken,
} from "../lib/auth/adminSession";

const ORIGINAL_ENV = {
  ADMIN_SESSION_SECRET: process.env.ADMIN_SESSION_SECRET,
  ADMIN_USERNAME: process.env.ADMIN_USERNAME,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  ADMIN_PASSWORD_HASH: process.env.ADMIN_PASSWORD_HASH,
};

const REAL_DATE_NOW = Date.now;

describe("admin session auth", () => {
  beforeEach(() => {
    process.env.ADMIN_SESSION_SECRET = "top-secret";
    process.env.ADMIN_USERNAME = "ops";
    process.env.ADMIN_PASSWORD = "letmein";
    delete process.env.ADMIN_PASSWORD_HASH;
    Date.now = () => 1_700_000_000_000;
  });

  afterEach(() => {
    process.env.ADMIN_SESSION_SECRET = ORIGINAL_ENV.ADMIN_SESSION_SECRET;
    process.env.ADMIN_USERNAME = ORIGINAL_ENV.ADMIN_USERNAME;
    process.env.ADMIN_PASSWORD = ORIGINAL_ENV.ADMIN_PASSWORD;
    process.env.ADMIN_PASSWORD_HASH = ORIGINAL_ENV.ADMIN_PASSWORD_HASH;
    Date.now = REAL_DATE_NOW;
  });

  test("accepts valid plain-text credentials and session tokens", async () => {
    assert.equal(isAdminAuthConfigured(), true);
    assert.equal(await validateAdminCredentials("ops", "letmein"), true);
    assert.equal(await validateAdminCredentials("ops", "wrong"), false);

    const token = createAdminSessionToken("ops");
    assert.ok(token);

    assert.deepEqual(verifyAdminSessionToken(token), {
      sub: "ops",
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 12,
    });
  });

  test("accepts scrypt password hashes", async () => {
    const salt = "unit-test-salt";
    const hash = scryptSync("hashed-password", salt, 32).toString("hex");
    process.env.ADMIN_PASSWORD_HASH = `${salt}:${hash}`;
    delete process.env.ADMIN_PASSWORD;

    assert.equal(await validateAdminCredentials("ops", "hashed-password"), true);
    assert.equal(await validateAdminCredentials("ops", "letmein"), false);
  });

  test("rejects expired or tampered session tokens", () => {
    const token = createAdminSessionToken("ops");
    assert.ok(token);

    const [payload] = token.split(".");
    assert.equal(verifyAdminSessionToken(`${payload}.invalid-signature`), null);

    Date.now = () => REAL_DATE_NOW() + 1000 * 60 * 60 * 24;
    assert.equal(verifyAdminSessionToken(token), null);
  });
});
