import { cookies } from "next/headers";
import { createHmac, timingSafeEqual, scryptSync, randomBytes } from "crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";

const GROOMER_SESSION_COOKIE = "alltails_groomer_session";
const GROOMER_SESSION_TTL_SECS = 60 * 60 * 24 * 14;

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

type GroomerSessionPayload = {
  sub: string;
  exp: number;
};

function encode(value: string) {
  return Buffer.from(value, "utf8").toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function getSessionSecret() {
  return process.env.GROOMER_SESSION_SECRET?.trim() || process.env.ADMIN_SESSION_SECRET?.trim() || null;
}

function sign(payload: string) {
  const secret = getSessionSecret();
  if (!secret) return null;
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqualString(a: string, b: string) {
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return timingSafeEqual(aBuffer, bBuffer);
}

function verifyScryptPassword(password: string, storedHash: string) {
  const [salt, expectedHex] = storedHash.split(":");
  if (!salt || !expectedHex) return false;
  const derived = scryptSync(password, salt, Buffer.from(expectedHex, "hex").length);
  const expected = Buffer.from(expectedHex, "hex");
  if (derived.length !== expected.length) return false;
  return timingSafeEqual(derived, expected);
}

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64);
  return `${salt}:${derived.toString("hex")}`;
}

export async function validateGroomerCredentials(phone: string, password: string) {
  const member = await prisma.teamMember.findFirst({
    where: {
      phone,
      isActive: true,
      passwordHash: { not: null },
    },
    include: {
      team: { select: { id: true, name: true, isActive: true } },
    },
  });

  if (!member || !member.team.isActive || !member.passwordHash) return null;
  if (!verifyScryptPassword(password, member.passwordHash)) return null;

  return {
    id: member.id,
    name: member.name,
    role: member.role,
    phone: member.phone,
    team: member.team,
  };
}

export function createGroomerSessionToken(memberId: string) {
  const now = Math.floor(Date.now() / 1000);
  const payload = encode(JSON.stringify({ sub: memberId, exp: now + GROOMER_SESSION_TTL_SECS } satisfies GroomerSessionPayload));
  const signature = sign(payload);
  if (!signature) return null;
  return `${payload}.${signature}`;
}

export function verifyGroomerSessionToken(token: string | undefined | null) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expectedSignature = sign(payload);
  if (!expectedSignature || !safeEqualString(signature, expectedSignature)) return null;

  try {
    const parsed = JSON.parse(decode(payload)) as GroomerSessionPayload;
    if (!parsed.sub || !parsed.exp) return null;
    if (parsed.exp <= Math.floor(Date.now() / 1000)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getGroomerSessionMember() {
  const jar = await cookies();
  const token = jar.get(GROOMER_SESSION_COOKIE)?.value;
  const verified = verifyGroomerSessionToken(token);
  if (!verified) return null;

  return prisma.teamMember.findUnique({
    where: { id: verified.sub },
    include: {
      team: true,
    },
  });
}

export async function hasGroomerSession() {
  return !!(await getGroomerSessionMember());
}

export function getGroomerSessionCookieName() {
  return GROOMER_SESSION_COOKIE;
}

export function getGroomerSessionMaxAge() {
  return GROOMER_SESSION_TTL_SECS;
}
