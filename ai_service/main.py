import os
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI
from pydantic import BaseModel, Field

load_dotenv()


def _get_collection(persist_dir: str, collection_name: str):
    import chromadb
    from chromadb.utils import embedding_functions

    openai_api_key = os.getenv("OPENAI_API_KEY")
    if not openai_api_key:
        raise RuntimeError(
            "OPENAI_API_KEY is required for textbook RAG embeddings. "
            "Set it in ai_service/.env or environment."
        )

    openai_model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

    ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key=openai_api_key,
        model_name=openai_model,
    )

    client = chromadb.PersistentClient(path=persist_dir)
    return client.get_or_create_collection(name=collection_name, embedding_function=ef)


def _confidence_from_distance(distance: Optional[float]) -> float:
    # Chroma distance scale depends on metric; for cosine distance it's usually ~[0, 2].
    if distance is None:
        return 0.0
    try:
        d = float(distance)
    except Exception:
        return 0.0
    # Map roughly into [0..1] where lower distance => higher confidence.
    conf = 1.0 - min(max(d / 2.0, 0.0), 1.0)
    return max(0.0, min(1.0, conf))


class Citation(BaseModel):
    chunk_id: str
    source: str
    page: Optional[int] = None
    excerpt: str
    distance: Optional[float] = None


class RagAnswerRequest(BaseModel):
    question: str = Field(..., min_length=1)
    top_k: int = Field(5, ge=1, le=12)
    collection: str = Field("textbooks")
    persist_dir: str = Field("./chroma_db")
    # Optional context from Node for future guardrails/ranking.
    user_profile: Optional[Dict[str, Any]] = None
    allowed_scope: Optional[str] = None


class RagAnswerResponse(BaseModel):
    answer: str
    citations: List[Citation]
    confidence: float
    retrieval_debug: Optional[Dict[str, Any]] = None


app = FastAPI(title="LifeSync AI Service", version="0.1.0")


@app.get("/")
def root():
    return {"status": "ok", "service": "LifeSync AI Service (RAG)"}


@app.post("/rag/answer", response_model=RagAnswerResponse)
def rag_answer(req: RagAnswerRequest):
    # Retrieve textbook excerpts with citations. Node will generate the final medical response.
    collection = _get_collection(req.persist_dir, req.collection)

    results = collection.query(
        query_texts=[req.question],
        n_results=req.top_k,
        include=["documents", "metadatas", "distances"],
    )

    documents = (results.get("documents") or [[]])[0]
    metadatas = (results.get("metadatas") or [[]])[0]
    distances = (results.get("distances") or [[]])[0]
    ids = (results.get("ids") or [[]])[0]

    citations: List[Citation] = []
    confidences: List[float] = []

    for i in range(min(len(documents), len(metadatas), len(distances), len(ids))):
        doc = documents[i] or ""
        meta = metadatas[i] or {}
        dist = distances[i]
        chunk_id = ids[i]
        conf = _confidence_from_distance(dist)
        confidences.append(conf)

        citations.append(
            Citation(
                chunk_id=chunk_id,
                source=str(meta.get("source") or "unknown"),
                page=int(meta.get("page")) if meta.get("page") is not None else None,
                excerpt=str(doc)[:800],
                distance=float(dist) if dist is not None else None,
            )
        )

    overall_conf = max(confidences) if confidences else 0.0

    if not citations or overall_conf < 0.25:
        # Mandatory "I don't know" behavior when retrieval is weak.
        return RagAnswerResponse(
            answer=(
                "I don't know from the textbook index I currently have. "
                "Try rephrasing your question or ingesting the relevant textbook sections."
            ),
            citations=citations,
            confidence=overall_conf,
            retrieval_debug={"reason": "low_retrieval_confidence"},
        )

    # Lightweight extractive answer: we intentionally avoid dosing/prescribing.
    # The Node orchestrator can pass these citations into its own LLM call.
    formatted_citations = []
    for c in citations[: min(5, len(citations))]:
        loc = f"{c.source}" + (f" p.{c.page}" if c.page else "")
        formatted_citations.append(f"- {loc}: {c.excerpt}")

    answer = (
        "Retrieved textbook excerpts (use these as the only grounding).\n" + "\n".join(formatted_citations)
    )

    return RagAnswerResponse(
        answer=answer,
        citations=citations,
        confidence=overall_conf,
        retrieval_debug={"top_k": req.top_k, "collection": req.collection},
    )
