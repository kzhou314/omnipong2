import type { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-only-set-JWT_SECRET-in-production";
const TOKEN_COOKIE = "omnipong_token";
const TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export type SessionPayload = {
  sub: number;
  email: string;
};

export function signToken(userId: number, email: string): string {
  return jwt.sign({ sub: userId, email }, JWT_SECRET, {
    expiresIn: TOKEN_MAX_AGE_MS / 1000,
  });
}

export function verifyToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (
      typeof decoded !== "object" ||
      decoded === null ||
      !("sub" in decoded) ||
      !("email" in decoded)
    ) {
      return null;
    }
    const sub = (decoded as { sub: unknown }).sub;
    const email = (decoded as { email: unknown }).email;
    if (typeof sub !== "number" || typeof email !== "string") {
      return null;
    }
    return { sub, email };
  } catch {
    return null;
  }
}

export function authCookieOptions(): CookieOptions {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_MS,
  };
}

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(TOKEN_COOKIE, token, authCookieOptions());
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(TOKEN_COOKIE, {
    ...authCookieOptions(),
    maxAge: 0,
  });
}

export function readTokenFromCookies(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const parts = cookieHeader.split(";").map((p) => p.trim());
  for (const p of parts) {
    if (p.startsWith(`${TOKEN_COOKIE}=`)) {
      return decodeURIComponent(p.slice(TOKEN_COOKIE.length + 1));
    }
  }
  return null;
}
