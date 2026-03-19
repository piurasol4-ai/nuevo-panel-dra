import bcrypt from "bcryptjs";
import { signSession as signJwtSession, verifySession as verifyJwtSession } from "./session";

export { SESSION_COOKIE_NAME } from "./session";

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
};

export async function hashPassword(password: string) {
  const salt = await bcrypt.genSalt(10);
  return await bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hashOrPlain: string) {
  // Compat: si en BD quedó una contraseña plana antigua, permitimos comparar directo
  if (!hashOrPlain.startsWith("$2a$") && !hashOrPlain.startsWith("$2b$")) {
    return password === hashOrPlain;
  }
  return await bcrypt.compare(password, hashOrPlain);
}

export async function signSession(user: AuthUser) {
  return await signJwtSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
}

export async function verifySession(token: string) {
  return await verifyJwtSession(token);
}

