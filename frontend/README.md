# ORBIT AI — React frontend

This is a standalone React + TypeScript + Vite frontend for the existing ORBIT AI research engine.

## 1. Install and run

Requirements: Node.js 18.18+ (or Node 20+).

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173.

The Vite dev server proxies `/api/*` to `http://127.0.0.1:8000` by default. Start your FastAPI backend separately. Set `VITE_API_PROXY_TARGET` in `.env` if your API uses another local port.

## 2. Important: verify the existing backend API contract

The notebook/backend functions and the FastAPI HTTP routes are not necessarily the same thing. This frontend uses the routes documented in the ORBIT AI blueprint:

- `GET /api/v1/health`
- `POST /api/v1/search`
- `GET /api/v1/documents/{document_id}`
- `POST /api/v1/feedback`
- `GET /api/v1/preferences`
- `GET /api/v1/graph`
- `POST /api/v1/compare`
- `GET /api/v1/memory`
- `POST /api/v1/memory`

Before treating the integration as complete, inspect the actual FastAPI route definitions and Pydantic request/response models in the current backend. Adjust `src/api.ts` payloads and paths to match them exactly. In particular, the current frontend assumes search returns `{ "results": [...] }` or `{ "papers": [...] }`, with each paper containing an ID, title, abstract, metadata, URL, and similarity/score. It does not fabricate papers if the API is unavailable.

The notebook's Python functions may need a small FastAPI adapter if no HTTP routes exist. Do not overwrite the existing MiniLM, dataset, embeddings, or SQLite implementation to add that adapter.

## 3. Project structure

```text
src/
  components/
    DetailPanel.tsx
    OrbitCanvas.tsx
    PaperCard.tsx
  api.ts
  App.tsx
  main.tsx
  styles.css
  types.ts
```

## 4. Design and behavior

- Curiosity-led search landing page
- Dark indigo / violet / cyan research visual language
- Orbital paper layout with selectable nodes and pause/resume motion
- Paper details panel and source link
- Search mode, category, relevance threshold and personalization controls
- Feedback, save, compare selection, EvidenceLab, Memory and Preference DNA entry points
- Responsive layouts and reduced-motion support
- Hover effects alter borders, text/icon accents and subtle shadows only; they do not paint over card content

## 5. Honest limitations

The orbit currently positions actual returned papers in relevance-inspired rings. It is a visual exploration layout, not a verified citation graph. A real concept/citation graph should be rendered from the backend's actual `build_orbit_map` output after its schema is inspected. The EvidenceLab response is displayed as returned by the backend; a dedicated comparison presentation can be added once its real response schema is known.
