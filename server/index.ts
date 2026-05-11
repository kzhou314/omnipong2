import bcrypt from "bcryptjs";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import type { Request, Response } from "express";
import { db, type UserRow } from "./db.js";
import {
  clearAuthCookie,
  readTokenFromCookies,
  setAuthCookie,
  signToken,
  verifyToken,
} from "./auth.js";

const PORT = Number(process.env.PORT) || 3001;
const app = express();

const corsOrigin = process.env.CORS_ORIGIN ?? "http://localhost:5173";

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(express.json({ limit: "32kb" }));
app.use(cookieParser());

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const insertUser = db.prepare(
  `INSERT INTO users (email, password_hash) VALUES (?, ?)`,
);
const selectUserByEmail = db.prepare<[string], UserRow>(
  `SELECT id, email, password_hash, created_at FROM users WHERE email = ?`,
);
const selectUserById = db.prepare<[number], UserRow>(
  `SELECT id, email, password_hash, created_at FROM users WHERE id = ?`,
);

function publicUser(row: UserRow) {
  return { id: row.id, email: row.email, createdAt: row.created_at };
}

function getBearerFromRequest(req: Request): string | null {
  const raw = req.headers.cookie;
  return readTokenFromCookies(raw);
}

app.post("/api/auth/register", (req: Request, res: Response) => {
  const emailRaw = req.body?.email;
  const password = req.body?.password;
  if (typeof emailRaw !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const email = normalizeEmail(emailRaw);
  if (!validateEmail(email)) {
    res.status(400).json({ error: "Invalid email address." });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters." });
    return;
  }
  if (password.length > 256) {
    res.status(400).json({ error: "Password is too long." });
    return;
  }

  const passwordHash = bcrypt.hashSync(password, 12);
  try {
    const info = insertUser.run(email, passwordHash);
    const id = Number(info.lastInsertRowid);
    const token = signToken(id, email);
    setAuthCookie(res, token);
    const row = selectUserById.get(id);
    if (!row) {
      res.status(500).json({ error: "Account created but could not be loaded." });
      return;
    }
    res.status(201).json({ user: publicUser(row) });
  } catch (e: unknown) {
    if (
      e instanceof Error &&
      e.message.includes("UNIQUE constraint failed")
    ) {
      res.status(409).json({ error: "An account with this email already exists." });
      return;
    }
    console.error(e);
    res.status(500).json({ error: "Could not create account." });
  }
});

app.post("/api/auth/login", (req: Request, res: Response) => {
  const emailRaw = req.body?.email;
  const password = req.body?.password;
  if (typeof emailRaw !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "Email and password are required." });
    return;
  }
  const email = normalizeEmail(emailRaw);
  const row = selectUserByEmail.get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }
  const token = signToken(row.id, row.email);
  setAuthCookie(res, token);
  res.json({ user: publicUser(row) });
});

app.post("/api/auth/logout", (_req: Request, res: Response) => {
  clearAuthCookie(res);
  res.status(204).end();
});

app.get("/api/auth/me", (req: Request, res: Response) => {
  const token = getBearerFromRequest(req);
  if (!token) {
    res.status(401).json({ error: "Not signed in." });
    return;
  }
  const payload = verifyToken(token);
  if (!payload) {
    clearAuthCookie(res);
    res.status(401).json({ error: "Session expired." });
    return;
  }
  const row = selectUserById.get(payload.sub);
  if (!row || row.email !== payload.email) {
    clearAuthCookie(res);
    res.status(401).json({ error: "Invalid session." });
    return;
  }
  res.json({ user: publicUser(row) });
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
