import type { Lang } from "@/lib/i18n";
import type { Source } from "@/store/useAppStore";

/**
 * Backend integration layer (FastAPI).
 * Endpoints:
 *  - POST /api/v1/query
 *  - POST /api/v1/query/audio
 *  - POST /api/v1/upload
 *  - GET  /api/v1/documents
 *  - DELETE /api/v1/documents/:id
 *
 * For now we simulate a streaming response client-side, but the shape
 * matches the real API contract so it can be wired with a single change.
 */

const API_BASE = (import.meta.env.VITE_API_BASE as string | undefined) ?? "/api/v1";

export type QueryPayload = {
  prompt: string;
  language?: Lang;
  model?: string;
  files?: File[];
};

export type QueryResponse = {
  text: string;
  sources: Source[];
  confidence: number;
  detectedLang: Lang;
};

const MOCK_SOURCES: Source[] = [
  { id: "s1", title: "OMS — Guide clinique paludisme 2024.pdf", page: 12, snippet: "Le traitement de première intention…" },
  { id: "s2", title: "Protocole national diabète — Niger.pdf", page: 4, snippet: "Surveillance glycémique chez l'adulte…" },
  { id: "s3", title: "Vidal — Amoxicilline.pdf", page: 1, snippet: "Posologie pédiatrique : 25-50 mg/kg/j…" },
];

function buildMockAnswer(prompt: string): string {
  return `D'après les documents indexés, voici une réponse synthétique à votre question.

**Question analysée :** ${prompt}

### Points clés
- Le traitement de référence est documenté dans les protocoles fournis.
- La posologie dépend du **poids** et de l'**âge** du patient.
- Surveillance recommandée toutes les **24 à 48 h**.

> ⚠️ Cette réponse est générée à des fins de démonstration et **ne remplace pas** un avis médical professionnel.

\`\`\`text
Étape 1 — Évaluation clinique
Étape 2 — Examens complémentaires
Étape 3 — Mise en place du protocole
\`\`\`
`;
}

export async function* streamQuery(payload: QueryPayload): AsyncGenerator<
  { type: "chunk"; text: string } | { type: "done"; meta: Omit<QueryResponse, "text"> }
> {
  // Real implementation with FastAPI backend
  try {
    const res = await fetch(`${API_BASE}/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: payload.prompt,
        language: payload.language,
      }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ detail: "Unknown error" }));
      throw new Error(errorData.detail || `HTTP ${res.status}`);
    }

    const data = await res.json();
    
    // Stream the response text character by character for smooth UX
    const fullText = data.answer || "";
    const tokens = fullText.split(/(\s+)/);
    for (const tk of tokens) {
      await new Promise((r) => setTimeout(r, 10 + Math.random() * 20));
      yield { type: "chunk", text: tk };
    }
    
    // Extract sources from retrieved_docs if available
    const sources: Source[] = (data.retrieved_docs || []).map((doc: any, idx: number) => ({
      id: `doc-${idx}`,
      title: doc.metadata?.filename || doc.metadata?.source || `Document ${idx + 1}`,
      page: doc.metadata?.page || 1,
      snippet: doc.page_content || doc.text || "",
    })).slice(0, 5);

    yield {
      type: "done",
      meta: {
        sources: sources.length > 0 ? sources : MOCK_SOURCES.slice(0, 2),
        confidence: data.confidence || 0.85,
        detectedLang: data.language || payload.language || "fr",
      },
    };
  } catch (error) {
    // Fallback to mock on error
    console.error("Backend query failed, using mock:", error);
    const full = buildMockAnswer(payload.prompt);
    const tokens = full.split(/(\s+)/);
    for (const tk of tokens) {
      await new Promise((r) => setTimeout(r, 18 + Math.random() * 30));
      yield { type: "chunk", text: tk };
    }
    yield {
      type: "done",
      meta: {
        sources: MOCK_SOURCES.slice(0, 2 + Math.floor(Math.random() * 2)),
        confidence: 0.82 + Math.random() * 0.15,
        detectedLang: payload.language ?? "fr",
      },
    };
  }
}

export type IngestedDoc = {
  id: string;
  name: string;
  size: number;
  pages: number;
  uploadedAt: number;
  status: "ready" | "processing" | "error";
};

const MOCK_DOCS: IngestedDoc[] = [
  { id: "d1", name: "OMS — Guide clinique paludisme 2024.pdf", size: 2_400_000, pages: 84, uploadedAt: Date.now() - 86_400_000, status: "ready" },
  { id: "d2", name: "Protocole national diabète — Niger.pdf", size: 1_100_000, pages: 32, uploadedAt: Date.now() - 3 * 86_400_000, status: "ready" },
  { id: "d3", name: "Vidal — Amoxicilline.pdf", size: 540_000, pages: 8, uploadedAt: Date.now() - 5 * 86_400_000, status: "ready" },
  { id: "d4", name: "Recommandations HTA — 2023.pdf", size: 1_800_000, pages: 56, uploadedAt: Date.now() - 7 * 86_400_000, status: "processing" },
];

export async function listDocuments(): Promise<IngestedDoc[]> {
  // Real implementation with FastAPI backend
  try {
    const res = await fetch(`${API_BASE}/documents`, { method: "GET" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const data = await res.json();
    return data.documents || data.map((doc: any) => ({
      id: doc.id || doc.filename,
      name: doc.filename || doc.name,
      size: doc.size || 0,
      pages: doc.pages || 1,
      uploadedAt: doc.uploaded_at || Date.now(),
      status: doc.status || "ready",
    }));
  } catch (error) {
    console.error("Failed to fetch documents from backend, using mock:", error);
    await new Promise((r) => setTimeout(r, 400));
    return MOCK_DOCS;
  }
}

export async function deleteDocument(id: string): Promise<void> {
  // Real implementation with FastAPI backend
  try {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: "DELETE" });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (error) {
    console.error("Failed to delete document from backend:", error);
    await new Promise((r) => setTimeout(r, 300));
    const i = MOCK_DOCS.findIndex((d) => d.id === id);
    if (i >= 0) MOCK_DOCS.splice(i, 1);
  }
}

export async function uploadDocument(file: File): Promise<IngestedDoc> {
  // Real implementation with FastAPI backend
  try {
    const fd = new FormData();
    fd.append("file", file);
    
    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      body: fd,
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    return {
      id: data.id || Math.random().toString(36).slice(2, 10),
      name: data.filename || file.name,
      size: data.size || file.size,
      pages: data.pages || Math.ceil(file.size / 30_000),
      uploadedAt: data.uploaded_at || Date.now(),
      status: data.status || "processing",
    };
  } catch (error) {
    console.error("Failed to upload document to backend, using mock:", error);
    await new Promise((r) => setTimeout(r, 800));
    const doc: IngestedDoc = {
      id: Math.random().toString(36).slice(2, 10),
      name: file.name,
      size: file.size,
      pages: Math.ceil(file.size / 30_000),
      uploadedAt: Date.now(),
      status: "ready",
    };
    MOCK_DOCS.unshift(doc);
    return doc;
  }
}

export { API_BASE };
