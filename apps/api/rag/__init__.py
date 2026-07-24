"""AgriBot RAG: ingest, hybrid retrieval, and evaluation helpers."""

from __future__ import annotations

__all__ = ["get_retriever", "retrieve_context", "reset_retriever_cache", "ingest"]


def __getattr__(name: str):
    if name in {"get_retriever", "retrieve_context", "reset_retriever_cache"}:
        from rag import retrieve as _retrieve

        return getattr(_retrieve, name)
    if name == "ingest":
        from rag.ingest import ingest as _ingest

        return _ingest
    raise AttributeError(f"module 'rag' has no attribute {name!r}")
