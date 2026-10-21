import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _resolve_data_dir() -> str:
    """Find the knowledge-base folder, whatever case the checkout used.

    Git stores the PDFs under `apps/api/Data` but the tracked KAMIS cache under
    `apps/api/data`. On a case-insensitive filesystem (macOS, Windows) they are
    the same directory; on a Linux container they are two. Probe both so a Linux
    deploy resolves the PDFs instead of silently ingesting nothing.
    """
    override = os.getenv("KB_DATA_DIR", "").strip()
    if override:
        return override
    for name in ("Data", "data"):
        candidate = os.path.join(BASE_DIR, name)
        if os.path.isdir(candidate):
            return candidate
    return os.path.join(BASE_DIR, "Data")


DATA_DIR = _resolve_data_dir()
CHROMA_DB_DIR = os.path.join(BASE_DIR, "chroma_db")
MANIFEST_PATH = os.path.join(CHROMA_DB_DIR, "manifest.json")
BM25_CORPUS_PATH = os.path.join(CHROMA_DB_DIR, "bm25_corpus.jsonl")
COLLECTION_NAME = "agriscan_kb"

EMBEDDING_MODEL = "all-MiniLM-L6-v2"
RERANKER_MODEL = "cross-encoder/ms-marco-MiniLM-L-6-v2"
# Contabo 8 GB default: leave reranker off until RAM headroom is proven.
RERANKER_ENABLED = os.getenv("RERANKER_ENABLED", "false").lower() in (
    "1",
    "true",
    "yes",
)

CHUNK_SIZE = 1000
CHUNK_OVERLAP = 200

# Retrieve more candidates, then rerank down to FINAL_K.
VECTOR_K = 8
BM25_K = 8
FINAL_K = 3
ENSEMBLE_WEIGHTS = (0.55, 0.45)  # vector, bm25

KB_VERSION = "2.0.0"
