import { SignJWT, jwtVerify } from "jose";

export type SessionPayload = {
  sub: string;
  email: string;
  name: string;
  role: string;
  exp: number;
  iat: number;
};

export const SESSION_COOKIE_NAME = "hc_session";

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error(
      "Missing JWT_SECRET. Configure it in .env (e.g. .env.local).",
    );
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: {
  sub: string;
  email: string;
  name: string;
  role: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime("14d")
    .sign(getSecret());
}

export async function verifySession(token: string) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as SessionPayload;
}

