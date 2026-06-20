import type { Lang } from "@/lib/i18n";
import type { Source } from "@/store/useAppStore";
import type { UserProfile } from "@/store/useAppStore";

export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api/v1";

// ── Auth header ───────────────────────────────────────────────────────────────

const API_KEY = import.meta.env.VITE_API_KEY as string | undefined;

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  // Access store state directly (safe outside React tree)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = (globalThis as any).__cerviscan_token__ ?? null;
  return {
    "Content-Type": "application/json",
    // Clé API (client autorise) — requise par les endpoints proteges du backend
    ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

/** Call this once after login so ragService can include the JWT. */
export function setServiceToken(token: string | null) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__cerviscan_token__ = token;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type HistoryMessage = { role: "user" | "assistant"; content: string };

export type QueryPayload = {
  prompt: string;
  language?: Lang;
  history?: HistoryMessage[];
  patient_context?: Record<string, string | number>;
};

export type QueryResponse = {
  text: string;
  sources: Source[];
  confidence: number;
  detectedLang: Lang;
};

export type IngestedDoc = {
  id: string;
  name: string;
  size: number;
  pages: number;
  uploadedAt: number;
  status: "ready" | "processing" | "error";
};

// ── Query ─────────────────────────────────────────────────────────────────────

export async function* streamQuery(
  payload: QueryPayload,
): AsyncGenerator<
  { type: "chunk"; text: string } | { type: "done"; meta: Omit<QueryResponse, "text"> }
> {
  const res = await fetch(`${API_BASE}/query`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      query: payload.prompt,
      language: payload.language ?? "auto",
      history: payload.history ?? [],
      patient_context: payload.patient_context ?? null,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  const data = await res.json();

  // Simulate token-by-token streaming for smooth UX
  const fullText: string = data.answer ?? "";
  const tokens = fullText.split(/(\s+)/);
  for (const tk of tokens) {
    await new Promise((r) => setTimeout(r, 8 + Math.random() * 15));
    yield { type: "chunk", text: tk };
  }

  const rawDocs: Array<{ content?: string; metadata?: Record<string, unknown> }> =
    data.retrieved_docs ?? [];

  const sources: Source[] = rawDocs
    .map((doc, idx) => ({
      id: `doc-${idx}`,
      title:
        (doc.metadata?.filename as string) ||
        (doc.metadata?.source as string) ||
        `Document ${idx + 1}`,
      page: (doc.metadata?.page as number) ?? undefined,
      snippet: doc.content ?? "",
    }))
    .slice(0, 5);

  yield {
    type: "done",
    meta: {
      sources,
      confidence: data.confidence ?? 0,
      detectedLang: (data.language ?? payload.language ?? "fr") as Lang,
    },
  };
}

// ── Documents ─────────────────────────────────────────────────────────────────

export async function listDocuments(): Promise<IngestedDoc[]> {
  const res = await fetch(`${API_BASE}/documents`, {
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const docs: Array<Record<string, unknown>> = data.documents ?? data;
  return docs.map((d) => ({
    id: (d.id ?? d.filename) as string,
    name: (d.filename ?? d.name) as string,
    size: (d.size ?? 0) as number,
    pages: (d.pages ?? 1) as number,
    uploadedAt: (d.uploaded_at ?? Date.now()) as number,
    status: (d.status ?? "ready") as "ready" | "processing" | "error",
  }));
}

export async function deleteDocument(id: string): Promise<void> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
}

export async function uploadDocument(file: File): Promise<IngestedDoc> {
  const fd = new FormData();
  fd.append("file", file);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const token = (globalThis as any).__cerviscan_token__ ?? null;
  const res = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    // multipart : pas de Content-Type manuel, mais on garde la cle API + le JWT
    headers: {
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: fd,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `HTTP ${res.status}` }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }
  const data = await res.json();
  return {
    id: (data.id ?? data.filename) as string,
    name: (data.filename ?? file.name) as string,
    size: (data.size ?? file.size) as number,
    pages: (data.pages ?? Math.ceil(file.size / 30_000)) as number,
    uploadedAt: (data.uploaded_at ?? Date.now()) as number,
    status: (data.status ?? "ready") as "ready" | "processing" | "error",
  };
}

// ── Feedback ──────────────────────────────────────────────────────────────────

export async function submitFeedback(params: {
  rating: "up" | "down";
  query: string;
  response: string;
  messageId?: string;
  conversationId?: string;
}): Promise<void> {
  await fetch(`${API_BASE}/feedback`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      rating: params.rating,
      query: params.query,
      response: params.response,
      message_id: params.messageId,
      conversation_id: params.conversationId,
    }),
  });
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export type RegisterPayload = {
  email: string;
  password: string;
  role: "patient" | "professional" | "admin";
  language?: string;
  nom?: string;
  prenom?: string;
  age?: number;
  region?: string;
  specialite?: string;
  etablissement?: string;
  admin_secret?: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: UserProfile;
};

export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data as AuthResponse;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data as AuthResponse;
}

export async function getMe(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data as UserProfile;
}

export async function updateMe(updates: Partial<UserProfile>): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(updates),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data as UserProfile;
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export async function adminListUsers(): Promise<UserProfile[]> {
  const res = await fetch(`${API_BASE}/auth/admin/users`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data as UserProfile[];
}

export async function adminChangeRole(userId: string, role: string): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/auth/admin/users/${userId}/role`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data as UserProfile;
}

export async function adminDeleteUser(userId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/auth/admin/users/${userId}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.detail ?? `HTTP ${res.status}`);
  }
}

export type AnalyticsData = {
  users: {
    total: number;
    by_role: { patient: number; professional: number; admin: number };
    by_language: { fr: number; en: number; ha: number };
    registrations_by_day: { day: string; date: string; count: number }[];
  };
  queries: {
    total: number;
    avg_latency_ms: number;
    by_language: { fr: number; en: number; ha: number };
    by_day: { day: string; date: string; count: number }[];
    latency_by_day: { day: string; date: string; ms: number }[];
  };
};

export async function adminGetAnalytics(): Promise<AnalyticsData> {
  const res = await fetch(`${API_BASE}/auth/admin/analytics`, { headers: authHeaders() });
  const data = await res.json();
  if (!res.ok) throw new Error(data.detail ?? `HTTP ${res.status}`);
  return data as AnalyticsData;
}
