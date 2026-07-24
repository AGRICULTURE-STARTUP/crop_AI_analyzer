"""Offline retrieval quality checks for AgriBot RAG."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Ensure project root is importable when run as a script.
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from rag.retrieve import retrieve_context

# Minimal gold set: each case expects at least one keyword in retrieved text.
EVAL_CASES = [
    {
        "id": "maize_faw",
        "query": "How do I control fall armyworm on maize?",
        "must_include_any": ["fall armyworm", "armyworm", "whorl", "insecticide"],
    },
    {
        "id": "bean_spacing",
        "query": "What is the recommended planting spacing for beans?",
        "must_include_any": ["bean", "spacing", "cm", "plant"],
    },
    {
        "id": "potato_blight",
        "query": "What are symptoms of late blight in Irish potatoes?",
        "must_include_any": ["blight", "potato", "lesion", "fung"],
    },
    {
        "id": "coffee_rust",
        "query": "How can I manage coffee leaf rust?",
        "must_include_any": ["coffee", "rust", "leaf", "fungicide", "resistant"],
    },
    {
        "id": "maize_storage",
        "query": "How should maize grain be dried and stored after harvest?",
        "must_include_any": ["moisture", "13", "14", "hermetic", "store", "dry"],
    },
    {
        "id": "tea_climate",
        "query": "What climate is suitable for tea production in Kenya?",
        "must_include_any": ["tea", "rainfall", "altitude", "temperature"],
    },
]


def evaluate(cases: list[dict] | None = None) -> dict:
    cases = cases or EVAL_CASES
    results = []
    passed = 0

    for case in cases:
        context, docs = retrieve_context(case["query"])
        haystack = (context + " " + " ".join(d.page_content for d in docs)).lower()
        needles = case["must_include_any"]
        hit = any(n.lower() in haystack for n in needles)
        sources = sorted({(d.metadata or {}).get("source", "?") for d in docs})
        row = {
            "id": case["id"],
            "query": case["query"],
            "pass": hit,
            "n_docs": len(docs),
            "sources": sources,
            "matched": [n for n in needles if n.lower() in haystack],
        }
        results.append(row)
        passed += int(hit)
        status = "PASS" if hit else "FAIL"
        print(f"[{status}] {case['id']}: {case['query']} -> {sources}")

    summary = {
        "passed": passed,
        "total": len(cases),
        "accuracy": round(passed / len(cases), 3) if cases else 0.0,
        "results": results,
    }
    print(f"\nScore: {passed}/{len(cases)} ({summary['accuracy']:.0%})")
    return summary


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate AgriBot RAG retrieval.")
    parser.add_argument("--json", action="store_true", help="Print full JSON summary.")
    args = parser.parse_args()
    summary = evaluate()
    if args.json:
        print(json.dumps(summary, indent=2))
    # Non-zero exit if majority fails — useful for CI later.
    if summary["passed"] < max(1, summary["total"] // 2):
        sys.exit(1)


if __name__ == "__main__":
    main()
