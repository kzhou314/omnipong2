export type ApiUser = {
  id: number;
  email: string;
  createdAt: string;
};

export type ApiErrorBody = { error: string };

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text) as T;
}

export async function apiPostJson<T>(
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: true; data: T } | { ok: false; status: number; error: string }> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await parseJson<T & ApiErrorBody>(res);
  if (!res.ok) {
    const msg =
      typeof (data as ApiErrorBody).error === "string"
        ? (data as ApiErrorBody).error
        : `Request failed (${res.status})`;
    return { ok: false, status: res.status, error: msg };
  }
  return { ok: true, data: data as T };
}

export async function apiGetJson<T>(
  path: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number }> {
  const res = await fetch(path, { credentials: "include" });
  const data = await parseJson<T>(res);
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  return { ok: true, data };
}

export async function apiPostEmpty(path: string): Promise<boolean> {
  const res = await fetch(path, {
    method: "POST",
    credentials: "include",
  });
  return res.ok;
}
