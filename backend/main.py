
import os
import re
import json
import sqlite3
import numpy as np
import torch

from pathlib import Path
from datetime import datetime, timezone
from collections import defaultdict, Counter
from itertools import combinations
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_FILE = BASE_DIR / "research_dataset.jsonl"
EMBEDDING_FILE = BASE_DIR / "research_embeddings.npy"
DB_PATH = BASE_DIR / "orbit_memory.db"

with open(DATASET_FILE, "r", encoding="utf-8") as f:
    papers = [json.loads(line) for line in f]

embeddings = np.load(EMBEDDING_FILE)

device = "cuda" if torch.cuda.is_available() else "cpu"
model = SentenceTransformer(
    "sentence-transformers/all-MiniLM-L6-v2",
    device=device
)

user_preferences = defaultdict(lambda: defaultdict(float))

STOPWORDS = {
    "the", "and", "for", "with", "from", "using",
    "based", "into", "that", "this", "are", "was",
    "were", "have", "has", "can", "how", "their",
    "our", "its", "between", "through", "approach",
    "method", "methods", "results", "study", "paper",
    "proposed", "new", "model", "models"
}



def extract_keywords(text, limit=5):
    words = re.findall(r"\b[a-zA-Z]{3,}\b", text.lower())

    filtered = [
        word for word in words
        if word not in STOPWORDS
    ]

    return [
        word for word, count in Counter(filtered).most_common(limit)
    ]


def get_db():
    return sqlite3.connect(DB_PATH)


def initialize_memory():

    with get_db() as conn:

        conn.execute("""
            CREATE TABLE IF NOT EXISTS saved_papers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                paper_id TEXT NOT NULL,
                title TEXT NOT NULL,
                abstract TEXT,
                categories TEXT,
                url TEXT,
                saved_at TEXT,
                UNIQUE(user_id, paper_id)
            )
        """)

        conn.execute("""
            CREATE TABLE IF NOT EXISTS search_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT NOT NULL,
                query TEXT NOT NULL,
                search_mode TEXT,
                searched_at TEXT
            )
        """)

    print("Research Memory database initialized!")


def semantic_search(query, top_k=5, category=None):

    query_embedding = model.encode(
        query,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    # Cosine similarity because embeddings are normalized
    scores = np.dot(embeddings, query_embedding)

    # Optional category filtering
    results = []

    for index, score in enumerate(scores):
        paper = papers[index]

        if category and category not in paper["categories"]:
            continue

        results.append({
            "id": paper["id"],
            "title": paper["title"],
            "abstract": paper["abstract"],
            "categories": paper["categories"],
            "similarity": float(score),
            "url": paper["url"]
        })

    results.sort(
        key=lambda x: x["similarity"],
        reverse=True
    )

    return results[:top_k]


def intent_lens_search(
    query,
    category=None,
    page=1,
    page_size=10,
    min_similarity=0.0
):
    if not query.strip():
        raise ValueError("Search query cannot be empty.")

    if page < 1 or page_size < 1:
        raise ValueError("Page and page_size must be positive.")

    # Generate query embedding
    query_embedding = model.encode(
        query,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    # Calculate cosine similarities
    scores = np.dot(embeddings, query_embedding)

    results = []

    for index, score in enumerate(scores):
        paper = papers[index]

        # Category filter
        if category and category not in paper["categories"]:
            continue

        # Similarity threshold
        if score < min_similarity:
            continue

        results.append({
            "id": paper["id"],
            "title": paper["title"],
            "abstract": paper["abstract"],
            "categories": paper["categories"],
            "similarity": round(float(score), 4),
            "url": paper["url"]
        })

    # Rank by similarity
    results.sort(
        key=lambda x: x["similarity"],
        reverse=True
    )

    total_results = len(results)

    # Pagination
    start = (page - 1) * page_size
    end = start + page_size

    return {
        "query": query,
        "category": category,
        "page": page,
        "page_size": page_size,
        "total_results": total_results,
        "total_pages": (total_results + page_size - 1) // page_size,
        "results": results[start:end]
    }


def record_feedback(user_id, paper_id, feedback):

    if feedback not in ["like", "dislike"]:
        raise ValueError("Feedback must be like or dislike.")

    paper = next(
        (p for p in papers if p["id"] == paper_id),
        None
    )

    if paper is None:
        raise ValueError("Paper not found.")

    # Positive or negative preference adjustment
    adjustment = 1.0 if feedback == "like" else -1.0

    for category in paper["categories"]:
        user_preferences[user_id][category] += adjustment

    return {
        "user_id": user_id,
        "paper_id": paper_id,
        "feedback": feedback,
        "updated_preferences": dict(user_preferences[user_id])
    }


def get_preference_dna(user_id):

    preferences = user_preferences[user_id]

    return {
        "user_id": user_id,
        "preferred_categories": sorted(
            preferences.items(),
            key=lambda x: x[1],
            reverse=True
        )
    }


def personalized_search(
    query,
    user_id,
    top_k=10
):
    query_embedding = model.encode(
        query,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    scores = np.dot(embeddings, query_embedding)

    preferences = user_preferences[user_id]

    results = []

    for index, semantic_score in enumerate(scores):
        paper = papers[index]

        # Calculate preference score
        preference_score = sum(
            preferences.get(category, 0)
            for category in paper["categories"]
        )

        # Normalize preference score
        preference_score = np.tanh(preference_score)

        # Combined ranking
        final_score = (
            0.8 * float(semantic_score)
            + 0.2 * preference_score
        )

        results.append({
            "title": paper["title"],
            "categories": paper["categories"],
            "semantic_score": round(float(semantic_score), 4),
            "preference_score": round(float(preference_score), 4),
            "final_score": round(final_score, 4),
            "url": paper["url"]
        })

    results.sort(
        key=lambda x: x["final_score"],
        reverse=True
    )

    return results[:top_k]


def build_orbit_map(query, top_k=10):

    search_results = semantic_search(query, top_k=top_k)

    nodes = {}
    edges = []

    for paper in search_results:

        paper_id = paper["id"]
        paper_node = "paper_" + paper_id

        nodes[paper_node] = {
            "id": paper_node,
            "label": paper["title"],
            "type": "paper"
        }

        # Connect paper to categories
        for category in paper["categories"]:

            category_node = "category_" + category

            nodes[category_node] = {
                "id": category_node,
                "label": category,
                "type": "category"
            }

            edges.append({
                "source": paper_node,
                "target": category_node,
                "type": "belongs_to"
            })

        # Extract and connect keywords
        keywords = extract_keywords(
            paper["title"] + " " + paper["abstract"],
            limit=5
        )

        for keyword in keywords:

            keyword_node = "keyword_" + keyword

            nodes[keyword_node] = {
                "id": keyword_node,
                "label": keyword,
                "type": "concept"
            }

            edges.append({
                "source": paper_node,
                "target": keyword_node,
                "type": "discusses"
            })

    return {
        "query": query,
        "total_nodes": len(nodes),
        "total_edges": len(edges),
        "nodes": list(nodes.values()),
        "edges": edges
    }


def evidence_lab(paper_ids):

    if not 2 <= len(paper_ids) <= 3:
        raise ValueError("Select 2 or 3 papers.")

    selected = []

    for paper_id in paper_ids:
        paper = next(
            (p for p in papers if p["id"] == paper_id),
            None
        )

        if paper is None:
            raise ValueError(f"Paper not found: {paper_id}")

        selected.append(paper)

    indices = [
        next(i for i, p in enumerate(papers) if p["id"] == pid)
        for pid in paper_ids
    ]

    selected_embeddings = embeddings[indices]

    similarities = np.dot(
        selected_embeddings,
        selected_embeddings.T
    )

    concepts = {}

    for paper in selected:
        concepts[paper["id"]] = set(
            extract_keywords(
                paper["title"] + " " + paper["abstract"],
                limit=10
            )
        )

    shared_concepts = set.intersection(*concepts.values())

    unique_concepts = {
        paper_id: sorted(
            concepts[paper_id] -
            set.union(*[
                concepts[other_id]
                for other_id in concepts
                if other_id != paper_id
            ])
        )
        for paper_id in concepts
    }

    comparisons = []

    for i, j in combinations(range(len(selected)), 2):
        comparisons.append({
            "paper_1": selected[i]["title"],
            "paper_2": selected[j]["title"],
            "similarity": round(
                float(similarities[i][j]), 4
            )
        })

    return {
        "papers": [
            {
                "id": p["id"],
                "title": p["title"],
                "abstract": p["abstract"],
                "categories": p["categories"]
            }
            for p in selected
        ],
        "comparisons": comparisons,
        "shared_concepts": sorted(shared_concepts),
        "unique_concepts": unique_concepts
    }


def serendipity_search(query, mode="balanced", top_k=10):

    if mode not in ["precise", "balanced", "explore"]:
        raise ValueError("Invalid mode")

    if top_k < 1:
        raise ValueError("top_k must be positive")

    query_embedding = model.encode(
        query,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    relevance = np.dot(embeddings, query_embedding)

    candidate_indices = np.argsort(relevance)[
        -min(100, len(papers)):
    ][::-1]

    weights = {
        "precise": 1.0,
        "balanced": 0.75,
        "explore": 0.45
    }

    selected = []
    remaining = list(candidate_indices)
    lambda_value = weights[mode]

    while remaining and len(selected) < top_k:

        best_index = None
        best_score = -float("inf")

        for index in remaining:

            if selected:
                similarities = np.dot(
                    embeddings[selected],
                    embeddings[index]
                )
                diversity_penalty = max(
                    float(np.max(similarities)), 0.0
                )
            else:
                diversity_penalty = 0.0

            mmr_score = (
                lambda_value * float(relevance[index])
                - (1 - lambda_value) * diversity_penalty
            )

            if mmr_score > best_score:
                best_score = mmr_score
                best_index = index

        selected.append(best_index)
        remaining.remove(best_index)

    return [
        {
            "id": papers[i]["id"],
            "title": papers[i]["title"],
            "categories": papers[i]["categories"],
            "similarity": round(float(relevance[i]), 4),
            "url": papers[i]["url"]
        }
        for i in selected
    ]


def save_paper(user_id, paper_id):

    paper = next(
        (p for p in papers if p["id"] == paper_id),
        None
    )

    if paper is None:
        raise ValueError("Paper not found.")

    with get_db() as conn:
        cursor = conn.execute("""
            INSERT OR IGNORE INTO saved_papers
            (user_id, paper_id, title, abstract,
             categories, url, saved_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            user_id,
            paper["id"],
            paper["title"],
            paper["abstract"],
            json.dumps(paper["categories"]),
            paper["url"],
            datetime.now(timezone.utc).isoformat()
        ))

    return {
        "saved": cursor.rowcount == 1,
        "paper_id": paper_id
    }


def list_saved_papers(user_id):

    with get_db() as conn:
        rows = conn.execute("""
            SELECT paper_id, title, categories, url, saved_at
            FROM saved_papers
            WHERE user_id = ?
            ORDER BY saved_at DESC
        """, (user_id,)).fetchall()

    return [
        {
            "paper_id": r[0],
            "title": r[1],
            "categories": json.loads(r[2]),
            "url": r[3],
            "saved_at": r[4]
        }
        for r in rows
    ]


def remove_saved_paper(user_id, paper_id):

    with get_db() as conn:
        cursor = conn.execute("""
            DELETE FROM saved_papers
            WHERE user_id = ? AND paper_id = ?
        """, (user_id, paper_id))

    return {"deleted": cursor.rowcount == 1}


def record_search(user_id, query, mode="precise"):

    with get_db() as conn:
        conn.execute("""
            INSERT INTO search_history
            (user_id, query, search_mode, searched_at)
            VALUES (?, ?, ?, ?)
        """, (
            user_id,
            query,
            mode,
            datetime.now(timezone.utc).isoformat()
        ))

    return {"recorded": True, "query": query}


def get_search_history(user_id, limit=20):

    with get_db() as conn:
        rows = conn.execute("""
            SELECT query, search_mode, searched_at
            FROM search_history
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ?
        """, (user_id, limit)).fetchall()

    return [
        {
            "query": r[0],
            "mode": r[1],
            "searched_at": r[2]
        }
        for r in rows
    ]



# Initialize database
initialize_memory()

app = FastAPI(
    title="ORBIT AI",
    description="Personalized Semantic Search and Research Discovery Engine",
    version="1.0.0"
)

class SearchRequest(BaseModel):
    query: str
    page: int = 1
    page_size: int = 10
    category: Optional[str] = None
    user_id: str = "researcher_001"

class FeedbackRequest(BaseModel):
    user_id: str
    paper_id: str
    feedback: str

class CompareRequest(BaseModel):
    paper_ids: list[str]

class SerendipityRequest(BaseModel):
    query: str
    mode: str = "balanced"
    top_k: int = 10

class SaveRequest(BaseModel):
    user_id: str
    paper_id: str

class HistoryRequest(BaseModel):
    user_id: str
    query: str
    mode: str = "precise"


# REQUEST MODELS

class SearchRequest(BaseModel):
    query: str
    page: int = 1
    page_size: int = 10
    category: str = None
    user_id: str = "researcher_001"

class FeedbackRequest(BaseModel):
    user_id: str
    paper_id: str
    feedback: str

class CompareRequest(BaseModel):
    paper_ids: list[str]

class SerendipityRequest(BaseModel):
    query: str
    mode: str = "balanced"
    top_k: int = 10

class SaveRequest(BaseModel):
    user_id: str
    paper_id: str

class HistoryRequest(BaseModel):
    user_id: str
    query: str
    mode: str = "precise"


@app.get("/api/v1/health")
def health():
    return {"status": "online", "project": "ORBIT AI", "features": 6}

@app.post("/api/v1/search")
def search_api(request: SearchRequest):
    try:
        result = intent_lens_search(
            request.query, request.category,
            request.page, request.page_size
        )
        record_search(request.user_id, request.query, "precise")
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/feedback")
def feedback_api(request: FeedbackRequest):
    try:
        return record_feedback(
            request.user_id, request.paper_id, request.feedback
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/v1/preferences/{user_id}")
def preferences_api(user_id: str):
    return get_preference_dna(user_id)

@app.get("/api/v1/personalized-search")
def personalized_api(
    query: str,
    user_id: str = "researcher_001",
    top_k: int = 10
):
    return personalized_search(query, user_id, top_k)

@app.get("/api/v1/orbit-map")
def orbit_map_api(query: str, top_k: int = 10):
    return build_orbit_map(query, top_k)

@app.post("/api/v1/evidence-lab")
def evidence_api(request: CompareRequest):
    try:
        return evidence_lab(request.paper_ids)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/serendipity")
def serendipity_api(request: SerendipityRequest):
    try:
        return {
            "mode": request.mode,
            "results": serendipity_search(
                request.query, request.mode, request.top_k
            )
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/v1/memory/save")
def save_api(request: SaveRequest):
    try:
        return save_paper(request.user_id, request.paper_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))

@app.get("/api/v1/memory/saved/{user_id}")
def saved_api(user_id: str):
    return list_saved_papers(user_id)

@app.delete("/api/v1/memory/saved/{user_id}/{paper_id}")
def delete_saved_api(user_id: str, paper_id: str):
    return remove_saved_paper(user_id, paper_id)

@app.post("/api/v1/memory/history")
def history_api(request: HistoryRequest):
    return record_search(request.user_id, request.query, request.mode)

@app.get("/api/v1/memory/history/{user_id}")
def history_list_api(user_id: str, limit: int = 20):
    return get_search_history(user_id, limit)


# ==========================================
# PERSISTENT PREFERENCE DNA - SQLITE
# ==========================================

def initialize_preference_storage():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id TEXT NOT NULL,
                category TEXT NOT NULL,
                score REAL NOT NULL DEFAULT 0,
                PRIMARY KEY (user_id, category)
            )
        """)


def record_feedback(user_id, paper_id, feedback):

    if feedback not in ["like", "dislike"]:
        raise ValueError("Feedback must be like or dislike.")

    paper = next(
        (p for p in papers if p["id"] == paper_id),
        None
    )

    if paper is None:
        raise ValueError("Paper not found.")

    adjustment = 1.0 if feedback == "like" else -1.0

    with sqlite3.connect(DB_PATH) as conn:
        for category in paper["categories"]:
            conn.execute("""
                INSERT INTO user_preferences (user_id, category, score)
                VALUES (?, ?, ?)
                ON CONFLICT(user_id, category)
                DO UPDATE SET score = score + excluded.score
            """, (user_id, category, adjustment))

    return {
        "user_id": user_id,
        "paper_id": paper_id,
        "feedback": feedback,
        "updated_preferences": {
            category: score
            for category, score in get_preference_dna(user_id)["preferred_categories"]
        }
    }


def get_preference_dna(user_id):

    with sqlite3.connect(DB_PATH) as conn:
        rows = conn.execute("""
            SELECT category, score
            FROM user_preferences
            WHERE user_id = ?
            ORDER BY score DESC
        """, (user_id,)).fetchall()

    return {
        "user_id": user_id,
        "preferred_categories": [
            [category, score] for category, score in rows
        ]
    }


def personalized_search(query, user_id, top_k=10):

    query_embedding = model.encode(
        query,
        convert_to_numpy=True,
        normalize_embeddings=True
    )

    scores = np.dot(embeddings, query_embedding)

    preferences = dict(
        get_preference_dna(user_id)["preferred_categories"]
    )

    results = []

    for index, semantic_score in enumerate(scores):
        paper = papers[index]

        preference_score = sum(
            preferences.get(category, 0)
            for category in paper["categories"]
        )

        preference_score = np.tanh(preference_score)

        final_score = (
            0.8 * float(semantic_score)
            + 0.2 * preference_score
        )

        results.append({
            "title": paper["title"],
            "categories": paper["categories"],
            "semantic_score": round(float(semantic_score), 4),
            "preference_score": round(float(preference_score), 4),
            "final_score": round(final_score, 4),
            "url": paper["url"]
        })

    results.sort(
        key=lambda x: x["final_score"],
        reverse=True
    )

    return results[:top_k]


initialize_preference_storage()

