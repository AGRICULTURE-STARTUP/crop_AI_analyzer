import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "Data")
CHROMA_DB_DIR = os.path.join(BASE_DIR, "chroma_db")
MANIFEST_PATH = os.path.join(CHROMA_DB_DIR, "manifest.json")
BM25_CORPUS_PATH = os.path.join(CHROMA_DB_DIR, "bm25_corpus.jsonl")
COLLECTION_NAME = "ukulimabora_kb"

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
