import argparse
import os
import pathlib
import re
import sys
import uuid
from dataclasses import dataclass
from typing import Iterable, List, Optional, Tuple

from dotenv import load_dotenv

load_dotenv()


def _require_env(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Missing {name}. Set it in environment or .env")
    return value


@dataclass(frozen=True)
class Chunk:
    text: str
    source: str
    page: int
    chunk_index: int


def _clean_text(text: str) -> str:
    text = text.replace("\u00a0", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def _chunk_text(text: str, *, chunk_chars: int, overlap_chars: int) -> List[str]:
    if chunk_chars <= 0:
        raise ValueError("chunk_chars must be > 0")
    if overlap_chars < 0:
        raise ValueError("overlap_chars must be >= 0")

    text = _clean_text(text)
    if not text:
        return []

    chunks: List[str] = []
    start = 0
    while start < len(text):
        end = min(len(text), start + chunk_chars)
        chunks.append(text[start:end])
        if end >= len(text):
            break
        start = max(0, end - overlap_chars)
    return chunks


def _iter_pdf_chunks(
    pdf_path: pathlib.Path,
    *,
    chunk_chars: int,
    overlap_chars: int,
    max_pages: Optional[int],
) -> Iterable[Chunk]:
    from pypdf import PdfReader

    reader = PdfReader(str(pdf_path))
    total_pages = len(reader.pages)
    limit = min(total_pages, max_pages) if max_pages else total_pages

    for page_index in range(limit):
        page = reader.pages[page_index]
        raw = page.extract_text() or ""
        raw = _clean_text(raw)
        if not raw:
            continue

        parts = _chunk_text(raw, chunk_chars=chunk_chars, overlap_chars=overlap_chars)
        for chunk_index, part in enumerate(parts):
            yield Chunk(
                text=part,
                source=pdf_path.name,
                page=page_index + 1,
                chunk_index=chunk_index,
            )


def _get_collection(persist_dir: str, collection_name: str):
    import chromadb
    from chromadb.utils import embedding_functions

    # Phase 4 default: OpenAI embeddings (permissioned content stays local; embeddings go to provider)
    openai_api_key = _require_env("OPENAI_API_KEY")
    openai_model = os.getenv("OPENAI_EMBEDDING_MODEL", "text-embedding-3-small")

    ef = embedding_functions.OpenAIEmbeddingFunction(
        api_key=openai_api_key,
        model_name=openai_model,
    )

    client = chromadb.PersistentClient(path=persist_dir)
    return client.get_or_create_collection(name=collection_name, embedding_function=ef)


def ingest_folder(
    *,
    input_dir: str,
    persist_dir: str,
    collection_name: str,
    chunk_chars: int,
    overlap_chars: int,
    max_pages: Optional[int],
    batch_size: int,
) -> Tuple[int, int]:
    input_path = pathlib.Path(input_dir)
    if not input_path.exists():
        raise RuntimeError(f"Input directory does not exist: {input_dir}")

    pdfs = sorted([p for p in input_path.glob("*.pdf") if p.is_file()])
    if not pdfs:
        raise RuntimeError(f"No PDFs found in: {input_dir}")

    collection = _get_collection(persist_dir, collection_name)

    ids: List[str] = []
    docs: List[str] = []
    metas: List[dict] = []

    total_chunks = 0

    def flush():
        if not ids:
            return
        collection.add(ids=ids, documents=docs, metadatas=metas)
        ids.clear()
        docs.clear()
        metas.clear()

    for pdf in pdfs:
        for chunk in _iter_pdf_chunks(
            pdf,
            chunk_chars=chunk_chars,
            overlap_chars=overlap_chars,
            max_pages=max_pages,
        ):
            chunk_id = f"{chunk.source}:{chunk.page}:{chunk.chunk_index}:{uuid.uuid4().hex[:8]}"
            ids.append(chunk_id)
            docs.append(chunk.text)
            metas.append(
                {
                    "source": chunk.source,
                    "page": chunk.page,
                    "chunk_index": chunk.chunk_index,
                }
            )
            total_chunks += 1

            if len(ids) >= batch_size:
                flush()

    flush()
    return (len(pdfs), total_chunks)


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest permissioned medical textbooks into Chroma")
    parser.add_argument("--input", default="./textbooks", help="Folder containing PDF textbooks")
    parser.add_argument("--persist", default="./chroma_db", help="Chroma persistent directory")
    parser.add_argument("--collection", default="textbooks", help="Chroma collection name")
    parser.add_argument("--chunk-chars", type=int, default=1200)
    parser.add_argument("--overlap-chars", type=int, default=200)
    parser.add_argument("--max-pages", type=int, default=0, help="Limit pages per PDF (0 = no limit)")
    parser.add_argument("--batch-size", type=int, default=64)

    args = parser.parse_args()
    max_pages = args.max_pages if args.max_pages and args.max_pages > 0 else None

    pdf_count, chunk_count = ingest_folder(
        input_dir=args.input,
        persist_dir=args.persist,
        collection_name=args.collection,
        chunk_chars=args.chunk_chars,
        overlap_chars=args.overlap_chars,
        max_pages=max_pages,
        batch_size=args.batch_size,
    )

    print(f"Ingested PDFs: {pdf_count}")
    print(f"Ingested chunks: {chunk_count}")


if __name__ == "__main__":
    try:
        main()
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        sys.exit(1)
