"""Hybrid (vector + BM25) retrieval with CrossEncoder reranking."""

from __future__ import annotations

import json
import os
import re
from typing import Any, Callable

from langchain_chroma import Chroma
from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings

from rag.config import (
    BM25_CORPUS_PATH,
    BM25_K,
    CHROMA_DB_DIR,
    COLLECTION_NAME,
    EMBEDDING_MODEL,
    ENSEMBLE_WEIGHTS,
    FINAL_K,
    RERANKER_ENABLED,
    RERANKER_MODEL,
    VECTOR_K,
)

_retriever_bundle: dict[str, Any] | None = None
_retriever_failed = False


def reset_retriever_cache() -> None:
    global _retriever_bundle, _retriever_failed
    _retriever_bundle = None
    _retriever_failed = False


def _load_bm25_docs(path: str = BM25_CORPUS_PATH) -> list[Document]:
    if not os.path.exists(path):
        return []
    docs: list[Document] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            row = json.loads(line)
            docs.append(
                Document(
                    page_content=row.get("page_content") or "",
                    metadata=row.get("metadata") or {},
                    id=row.get("id"),
                )
            )
    return docs


def _rrf_fuse(
    ranked_lists: list[list[Document]],
    weights: tuple[float, ...],
    k: int = 60,
) -> list[Document]:
    """Reciprocal Rank Fusion across ranked document lists."""
    scores: dict[str, float] = {}
    best: dict[str, Document] = {}
    for weight, docs in zip(weights, ranked_lists):
        for rank, doc in enumerate(docs):
            key = doc.id or f"{doc.metadata.get('source')}:{doc.metadata.get('chunk_index')}:{hash(doc.page_content)}"
            scores[key] = scores.get(key, 0.0) + weight * (1.0 / (k + rank + 1))
            if key not in best:
                best[key] = doc
    ordered = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [best[key] for key, _ in ordered]


def _detect_crop_filter(query: str) -> str | None:
    from rag.metadata import CROP_ALIASES

    q = query.lower()
    # Prefer longer / more specific keys first
    keys = sorted(CROP_ALIASES.keys(), key=len, reverse=True)
    for key in keys:
        if key in ("cropsdetails", "soilatlas-2025_-ke-edition-web"):
            continue
        if re.search(rf"\b{re.escape(key)}\b", q) or re.search(
            rf"\b{re.escape(key.replace('_', ' '))}\b", q
        ):
            return key if key != "beans" else "bean"
    return None


def _metadata_filter_for_query(query: str) -> dict[str, Any] | None:
    """
    Soft crop filter: Chroma where clause on substring is limited, so we filter
    post-retrieval using metadata['crop'] which is a comma-joined string.
    """
    crop = _detect_crop_filter(query)
    if not crop:
        return None
    return {"crop_hint": crop}


def _apply_crop_soft_filter(docs: list[Document], crop_hint: str | None) -> list[Document]:
    if not crop_hint or not docs:
        return docs
    matched = [d for d in docs if crop_hint in (d.metadata.get("crop") or "")]
    # Keep filter only if it doesn't collapse the candidate set too hard.
    return matched if len(matched) >= max(1, len(docs) // 4) else docs


class HybridRerankRetriever:
    """Callable retriever compatible with LangChain-style .invoke(query)."""

    def __init__(
        self,
        vectorstore: Chroma,
        bm25_docs: list[Document],
        *,
        reranker: Callable[[str, list[Document], int], list[Document]] | None = None,
        vector_k: int = VECTOR_K,
        bm25_k: int = BM25_K,
        final_k: int = FINAL_K,
        weights: tuple[float, float] = ENSEMBLE_WEIGHTS,
    ):
        self.vectorstore = vectorstore
        self.bm25_docs = bm25_docs
        self.reranker = reranker
        self.vector_k = vector_k
        self.bm25_k = bm25_k
        self.final_k = final_k
        self.weights = weights
        self._bm25 = None
        if bm25_docs:
            try:
                from rank_bm25 import BM25Okapi

                tokenized = [self._tokenize(d.page_content) for d in bm25_docs]
                self._bm25 = BM25Okapi(tokenized)
            except Exception as e:
                print("Warning: BM25 unavailable, using vector-only retrieval:", e)
                self._bm25 = None

    @staticmethod
    def _tokenize(text: str) -> list[str]:
        return re.findall(r"[a-z0-9]+", text.lower())

    def _bm25_search(self, query: str) -> list[Document]:
        if not self._bm25 or not self.bm25_docs:
            return []
        scores = self._bm25.get_scores(self._tokenize(query))
        ranked_idx = sorted(range(len(scores)), key=lambda i: scores[i], reverse=True)[
            : self.bm25_k
        ]
        return [self.bm25_docs[i] for i in ranked_idx if scores[i] > 0]

    def _vector_search(self, query: str) -> list[Document]:
        try:
            return self.vectorstore.similarity_search(query, k=self.vector_k)
        except Exception as e:
            print("Warning: vector search failed:", e)
            return []

    def invoke(self, query: str) -> list[Document]:
        crop_filter = _metadata_filter_for_query(query)
        crop_hint = (crop_filter or {}).get("crop_hint")

        vector_hits = _apply_crop_soft_filter(self._vector_search(query), crop_hint)
        bm25_hits = _apply_crop_soft_filter(self._bm25_search(query), crop_hint)

        if vector_hits and bm25_hits:
            fused = _rrf_fuse([vector_hits, bm25_hits], self.weights)
        else:
            fused = vector_hits or bm25_hits

        # Fetch extra before rerank
        candidates = fused[: max(self.final_k * 3, 10)]
        if self.reranker and candidates:
            return self.reranker(query, candidates, self.final_k)
        return candidates[: self.final_k]

    # LangChain BaseRetriever compatibility for older call sites
    def get_relevant_documents(self, query: str) -> list[Document]:
        return self.invoke(query)


def _build_cross_encoder_reranker():
    try:
        from sentence_transformers import CrossEncoder
    except Exception as e:
        print("Warning: CrossEncoder unavailable, skipping rerank:", e)
        return None

    model = CrossEncoder(RERANKER_MODEL)

    def rerank(query: str, docs: list[Document], top_k: int) -> list[Document]:
        if not docs:
            return []
        pairs = [(query, d.page_content) for d in docs]
        scores = model.predict(pairs)
        ranked = sorted(zip(docs, scores), key=lambda x: float(x[1]), reverse=True)
        return [doc for doc, _ in ranked[:top_k]]

    return rerank


def build_retriever() -> HybridRerankRetriever | None:
    if not os.path.isdir(CHROMA_DB_DIR):
        return None
    embeddings = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    vectorstore = Chroma(
        collection_name=COLLECTION_NAME,
        embedding_function=embeddings,
        persist_directory=CHROMA_DB_DIR,
    )
    bm25_docs = _load_bm25_docs()
    reranker = _build_cross_encoder_reranker() if RERANKER_ENABLED else None
    return HybridRerankRetriever(vectorstore, bm25_docs, reranker=reranker)


def get_retriever() -> HybridRerankRetriever | None:
    global _retriever_bundle, _retriever_failed
    if _retriever_failed:
        return None
    if _retriever_bundle is None:
        try:
            _retriever_bundle = {"retriever": build_retriever()}
            if _retriever_bundle["retriever"] is None:
                _retriever_failed = True
                return None
        except Exception as e:
            print("Warning: Could not initialize RAG retriever:", e)
            _retriever_failed = True
            return None
    return _retriever_bundle["retriever"]


def retrieve_context(query: str, *, k: int | None = None) -> tuple[str, list[Document]]:
    """Return prompt-ready context string and raw docs."""
    retriever = get_retriever()
    if not retriever:
        return "", []
    if k is not None:
        retriever.final_k = k
    docs = retriever.invoke(query)
    if not docs:
        return "", []

    blocks = []
    for doc in docs:
        src = doc.metadata.get("source", "unknown")
        page = doc.metadata.get("page", "?")
        crop = doc.metadata.get("crop", "")
        lang = doc.metadata.get("language", "")
        header = f"[{src} p.{page} | crop={crop} | lang={lang}]"
        body = doc.page_content.replace("\n", " ").strip()
        blocks.append(f"{header} {body}")
    context = "\n            Relevant Context from Documents:\n            " + "\n            ".join(blocks)
    return context, docs
