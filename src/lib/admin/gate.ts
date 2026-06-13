import crypto from "crypto";

export const ADMIN_GATE_COOKIE = "admin_gate";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function gateSecret() {
  return process.env.ADMIN_GATE_SECRET ?? process.env.ADMIN_PASSWORD ?? "";
}

export function verifyAdminPassword(password: string) {
  const expected = process.env.ADMIN_PASSWORD ?? "";
  if (!expected) return false;
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export function createAdminGateToken() {
  const secret = gateSecret();
  if (!secret) return "";
  const expiresAt = Date.now() + TOKEN_TTL_MS;
  const payload = `admin:${expiresAt}`;
  const signature = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${payload}.${signature}`;
}

export function verifyAdminGateToken(token: string | undefined | null) {
  if (!token) return false;
  const secret = gateSecret();
  if (!secret) return false;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;

  const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  const sigBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return false;
  }

  const expiresAt = Number(payload.split(":")[1]);
  return Number.isFinite(expiresAt) && Date.now() < expiresAt;
}
