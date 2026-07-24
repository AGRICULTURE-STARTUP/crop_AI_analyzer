"""Incremental PDF ingest into Chroma + BM25 corpus with versioning."""

from __future__ import annotations

import argparse
import json
import os
import shutil
from typing import Any

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pypdf import PdfReader

from rag.config import (
    BM25_CORPUS_PATH,
    CHROMA_DB_DIR,
    CHUNK_OVERLAP,
    CHUNK_SIZE,
    COLLECTION_NAME,
    DATA_DIR,
    EMBEDDING_MODEL,
    KB_VERSION,
    MANIFEST_PATH,
)
from rag.metadata import build_chunk_metadata
from rag.text_cleanup import clean_text
from rag.versioning import chunk_id, file_sha256, load_manifest, save_manifest


def _list_pdfs(data_dir: str) -> list[str]:
    if not os.path.isdir(data_dir):
        return []
    return sorted(
        os.path.join(data_dir, name)
        for name in os.listdir(data_dir)
        if name.lower().endswith(".pdf")
    )


def _load_pdf_pages(path: str) -> list[tuple[int, str]]:
    reader = PdfReader(path)
    pages: list[tuple[int, str]] = []
    for i, page in enumerate(reader.pages):
        raw = page.extract_text() or ""
        text = clean_text(raw)
        if text:
            pages.append((i + 1, text))
    return pages


def _chroma_safe_metadata(meta: dict[str, Any]) -> dict[str, Any]:
    """Chroma only accepts str/int/float/bool metadata values."""
    safe: dict[str, Any] = {}
    for key, value in meta.items():
        if isinstance(value, (str, int, float, bool)) or value is None:
            if value is None:
                continue
            safe[key] = value
        elif isinstance(value, list):
            safe[key] = ",".join(str(v) for v in value)
        else:
            safe[key] = str(value)
    return safe


def _documents_for_pdf(path: str, file_hash: str) -> list[Document]:
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    docs: list[Document] = []
    chunk_index = 0
    for page_num, page_text in _load_pdf_pages(path):
        for chunk in splitter.split_text(page_text):
            meta = build_chunk_metadata(
                path,
                page=page_num,
                chunk_index=chunk_index,
                file_hash=file_hash,
                text=chunk,
                kb_version=KB_VERSION,
            )
            docs.append(
                Document(
                    page_content=chunk,
                    metadata=_chroma_safe_metadata(meta),
                    id=chunk_id(file_hash, chunk_index),
                )
            )
            chunk_index += 1
    return docs


def _get_embeddings() -> HuggingFaceEmbeddings:
    return HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)


def _open_vectorstore(embeddings: HuggingFaceEmbeddings) -> Chroma:
    os.makedirs(CHROMA_DB_DIR, exist_ok=True)
    return Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DB_DIR,
    )


def _delete_file_chunks(vectorstore: Chroma, source_name: str) -> int:
    """Remove existing chunks for a source file (by metadata.source)."""
    try:
        existing = vectorstore.get(where={"source": source_name})
    except Exception:
        return 0
    ids = existing.get("ids") or []
    if ids:
        vectorstore.delete(ids=ids)
    return len(ids)


def _write_bm25_corpus(vectorstore: Chroma, path: str = BM25_CORPUS_PATH) -> int:
    data = vectorstore.get(include=["documents", "metadatas"])
    ids = data.get("ids") or []
    documents = data.get("documents") or []
    metadatas = data.get("metadatas") or []
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for doc_id, content, meta in zip(ids, documents, metadatas):
            if not content:
                continue
            record = {
                "id": doc_id,
                "page_content": content,
                "metadata": meta or {},
            }
            f.write(json.dumps(record, ensure_ascii=False) + "\n")
    return len(ids)


def ingest(
    data_dir: str = DATA_DIR,
    *,
    full_rebuild: bool = False,
    force_files: list[str] | None = None,
) -> dict[str, Any]:
    """
    Incrementally ingest PDFs.

    - Unchanged files (same sha256) are skipped.
    - Changed/new files: old chunks deleted, new chunks upserted.
    - Removed PDFs: chunks deleted from the store.
    - Writes BM25 corpus JSONL + versioned manifest.
    """
    pdfs = _list_pdfs(data_dir)
    if not pdfs:
        raise FileNotFoundError(f"No PDFs found in {data_dir}")

    if full_rebuild and os.path.isdir(CHROMA_DB_DIR):
        shutil.rmtree(CHROMA_DB_DIR)

    embeddings = _get_embeddings()
    vectorstore = _open_vectorstore(embeddings)
    manifest = {"kb_version": KB_VERSION, "created_at": None, "updated_at": None, "files": {}, "stats": {}} if full_rebuild else load_manifest()
    previous_files = dict(manifest.get("files") or {})
    force = {os.path.basename(p) for p in (force_files or [])}

    added = updated = skipped = removed = 0
    total_chunks = 0
    current_names: set[str] = set()

    for path in pdfs:
        name = os.path.basename(path)
        current_names.add(name)
        digest = file_sha256(path)
        prev = previous_files.get(name) or {}
        unchanged = prev.get("sha256") == digest and name not in force and not full_rebuild

        if unchanged:
            skipped += 1
            total_chunks += int(prev.get("chunk_count") or 0)
            continue

        deleted = _delete_file_chunks(vectorstore, name)
        docs = _documents_for_pdf(path, digest)
        if docs:
            vectorstore.add_documents(docs, ids=[d.id for d in docs])

        entry = {
            "sha256": digest,
            "path": path,
            "chunk_count": len(docs),
            "bytes": os.path.getsize(path),
        }
        if name in previous_files:
            updated += 1
        else:
            added += 1
        previous_files[name] = entry
        total_chunks += len(docs)
        print(f"{'Updated' if deleted else 'Added'} {name}: {len(docs)} chunks (removed {deleted} old)")

    # Drop vectors for PDFs that no longer exist in Data/
    for name in list(previous_files.keys()):
        if name not in current_names:
            deleted = _delete_file_chunks(vectorstore, name)
            previous_files.pop(name, None)
            removed += 1
            print(f"Removed {name}: deleted {deleted} chunks")

    corpus_count = _write_bm25_corpus(vectorstore)
    manifest["files"] = previous_files
    manifest["stats"] = {
        "pdf_count": len(current_names),
        "chunk_count": corpus_count,
        "added": added,
        "updated": updated,
        "skipped": skipped,
        "removed": removed,
        "embedding_model": EMBEDDING_MODEL,
        "collection": COLLECTION_NAME,
    }
    save_manifest(manifest, MANIFEST_PATH)

    summary = {
        "added": added,
        "updated": updated,
        "skipped": skipped,
        "removed": removed,
        "chunk_count": corpus_count,
        "manifest": MANIFEST_PATH,
        "bm25_corpus": BM25_CORPUS_PATH,
    }
    print(
        f"Ingestion complete: +{added} ~{updated} ={skipped} -{removed}; "
        f"{corpus_count} chunks indexed (kb {KB_VERSION})"
    )
    return summary


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Ingest AgriBot RAG PDFs into Chroma (incremental).")
    parser.add_argument("--rebuild", action="store_true", help="Wipe chroma_db and rebuild from scratch.")
    parser.add_argument(
        "--force",
        nargs="*",
        default=[],
        help="Force re-ingest of specific PDF filenames even if hash unchanged.",
    )
    parser.add_argument("--data-dir", default=DATA_DIR, help="Directory containing PDFs.")
    args = parser.parse_args(argv)
    ingest(args.data_dir, full_rebuild=args.rebuild, force_files=args.force)


if __name__ == "__main__":
    main()
