# ORBIT AI
Personalized Semantic Search and Research Discovery Engine

## Features
1. IntentLens - Semantic research search
2. Preference DNA - Persistent personalized preferences
3. OrbitMap - Research concept relationships
4. EvidenceLab - Multi-paper comparison
5. Serendipity Engine - Diversity-aware discovery
6. Research Memory - Saved papers and search history

## Dataset
5,000 research papers with precomputed MiniLM embeddings.

## Installation
pip install -r requirements.txt

## Run
uvicorn backend.main:app --host 0.0.0.0 --port 8000

## API Documentation
http://localhost:8000/docs

## Model
sentence-transformers/all-MiniLM-L6-v2

## Database
SQLite: orbit_memory.db
