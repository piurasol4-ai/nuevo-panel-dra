import crypto from "crypto";

export function createEmailVerifyToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const hash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30 min
  return { token, hash, expiresAt };
}

export function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

