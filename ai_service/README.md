# LifeSync AI Service (Phase 4: Medical Textbook RAG)

This Python microservice provides **permissioned textbook retrieval** for LifeSync medical-mode chat.

What it does:

- Ingests your locally-owned/permissioned PDF textbooks into a persistent Chroma index.
- Exposes `POST /rag/answer` which returns **retrieved excerpts + citations + confidence**.
- The Node server uses those citations as grounding for the final medical response.

## Setup

From repo root:

```bash
cd ai_service
python -m venv .venv
./.venv/Scripts/activate
pip install -r requirements.txt
```

Create `ai_service/.env`:

```bash
OPENAI_API_KEY=...
OPENAI_EMBEDDING_MODEL=text-embedding-3-small
```

## Ingest textbooks

Put PDFs into `ai_service/textbooks/` (this folder is ignored by git).

Then run:

```bash
python scripts/ingest_textbooks.py --input ./textbooks --persist ./chroma_db --collection textbooks
```

## Run the service

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Health check:

- `GET http://localhost:8000/`

## API

### `POST /rag/answer`

Request:

```json
{ "question": "What are red flags for headache?", "top_k": 5 }
```

Response:

```json
{
	"answer": "Retrieved textbook excerpts...",
	"citations": [{"chunk_id":"...","source":"Book.pdf","page":12,"excerpt":"...","distance":0.42}],
	"confidence": 0.7
}
```

Guardrails:

- Always returns citations; if retrieval confidence is low, returns an explicit "I don't know" response.