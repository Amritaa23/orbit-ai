import type { Paper, SearchResponse } from "./types";

const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const USER_ID = import.meta.env.VITE_ORBIT_USER_ID || "researcher_001";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {})
    }
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      (body as { detail?: string; message?: string }).detail ||
      (body as { message?: string }).message ||
      `Request failed (${response.status})`;

    throw new Error(detail);
  }

  return body as T;
}

function normalizePaper(raw: Record<string, unknown>): Paper {
  const score = Number(raw.similarity ?? raw.score ?? raw.relevance ?? 0);

  return {
    id: String(raw.id ?? raw.paper_id ?? raw.document_id ?? ""),
    title: String(raw.title ?? raw.name ?? "Untitled research paper"),
    abstract: String(raw.abstract ?? raw.summary ?? raw.excerpt ?? ""),
    authors: (raw.authors as string[] | string) ?? [],
    categories: (raw.categories as string[] | string) ?? [],
    published: String(raw.published ?? raw.year ?? ""),
    source: String(raw.source ?? ""),
    url: String(raw.url ?? raw.link ?? ""),
    similarity: score > 1 ? score / 100 : score,
    excerpt: String(raw.excerpt ?? "")
  };
}

export function normalizeResults(
  data: SearchResponse | Paper[] | Record<string, unknown>
): Paper[] {
  const raw = Array.isArray(data)
    ? data
    : (
        (data as SearchResponse).results ??
        (data as SearchResponse).papers ??
        []
      );

  return (raw as Record<string, unknown>[])
    .map(normalizePaper)
    .filter(paper => paper.id || paper.title);
}

export async function healthCheck() {
  return request<Record<string, unknown>>("/api/v1/health");
}

// INTENTLENS + PERSONALIZED SEARCH
export async function searchPapers(
  query: string,
  options: {
    topK?: number;
    category?: string;
    minSimilarity?: number;
    mode?: string;
    personalized?: boolean;
  } = {}
): Promise<Paper[]> {
  const topK = options.topK ?? 12;

  if (options.personalized) {
    const params = new URLSearchParams({
      query,
      user_id: USER_ID,
      top_k: String(topK)
    });

    const data = await request<SearchResponse | Paper[]>(
      `/api/v1/personalized-search?${params.toString()}`
    );

    return normalizeResults(data);
  }

  const payload: {
    query: string;
    user_id: string;
    page: number;
    page_size: number;
    category?: string;
  } = {
    query,
    user_id: USER_ID,
    page: 1,
    page_size: topK
  };

  if (options.category && options.category !== "All") {
    payload.category = options.category;
  }

  const data = await request<SearchResponse>(
    "/api/v1/search",
    {
      method: "POST",
      body: JSON.stringify(payload)
    }
  );

  return normalizeResults(data);
}

// FEEDBACK DNA
export async function sendFeedback(
  paperId: string,
  feedback: "like" | "dislike"
) {
  return request("/api/v1/feedback", {
    method: "POST",
    body: JSON.stringify({
      user_id: USER_ID,
      paper_id: paperId,
      feedback
    })
  });
}

// RESEARCH MEMORY
export async function saveMemory(paperId: string) {
  return request("/api/v1/memory/save", {
    method: "POST",
    body: JSON.stringify({
      user_id: USER_ID,
      paper_id: paperId
    })
  });
}

export async function getMemory() {
  const [savedPapers, history] = await Promise.all([
    request<unknown[]>(
      `/api/v1/memory/saved/${encodeURIComponent(USER_ID)}`
    ),
    request<unknown[]>(
      `/api/v1/memory/history/${encodeURIComponent(USER_ID)}`
    )
  ]);

  return {
    saved_papers: savedPapers,
    history
  };
}

export async function removeSavedPaper(paperId: string) {
  return request(
    `/api/v1/memory/saved/${encodeURIComponent(USER_ID)}/${encodeURIComponent(paperId)}`,
    { method: "DELETE" }
  );
}

// PREFERENCE DNA
export async function getPreferences() {
  return request<Record<string, unknown>>(
    `/api/v1/preferences/${encodeURIComponent(USER_ID)}`
  );
}

// ORBITMAP
export async function getGraph(query: string) {
  const params = new URLSearchParams({
    query,
    top_k: "12"
  });

  return request<Record<string, unknown>>(
    `/api/v1/orbit-map?${params.toString()}`
  );
}

// EVIDENCELAB
export async function comparePapers(ids: string[]) {
  return request<Record<string, unknown>>(
    "/api/v1/evidence-lab",
    {
      method: "POST",
      body: JSON.stringify({
        paper_ids: ids
      })
    }
  );
}

// SERENDIPITY
export async function serendipitySearch(
  query: string,
  mode: "precise" | "balanced" | "explore" = "balanced",
  topK = 10
) {
  const data = await request<SearchResponse | Paper[]>(
    "/api/v1/serendipity",
    {
      method: "POST",
      body: JSON.stringify({
        query,
        mode,
        top_k: topK
      })
    }
  );

  return normalizeResults(data);
}
