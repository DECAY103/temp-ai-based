"""
evaluation/semantic_ranker.py — Stage 1 semantic pre-filtering.
Owner: Person 3 (M.7)

Uses lightweight TF-IDF n-gram vectorization and cosine similarity to rank
candidates against the job rubric with near-zero memory footprint (< 15 MB RAM).
Promotes the top-N candidates to Stage 2 LLM evaluation.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)


@dataclass
class RankedCandidate:
    candidate_id: str
    cosine_similarity_score: float
    promoted: bool  # True → goes to Stage 2; False → pre_filtered


def rank_candidates(
    rubric_text: str,
    candidates: dict[str, str],
    top_n: int,
) -> list[RankedCandidate]:
    """
    Rank candidates by semantic similarity to the job rubric using TF-IDF cosine similarity.

    Args:
        rubric_text: Plain-text representation of the job rubric.
        candidates: Mapping of candidate_id → anonymised résumé text.
        top_n: Number of top candidates to promote to Stage 2.

    Returns:
        List of RankedCandidate, sorted by cosine_similarity_score descending.
        Top-N have promoted=True; the rest have promoted=False.
    """
    if not candidates or not rubric_text.strip() or top_n <= 0:
        return [RankedCandidate(candidate_id, 0.0, False) for candidate_id in candidates]

    try:
        candidate_ids = list(candidates.keys())
        documents = [rubric_text] + [candidates[cid] for cid in candidate_ids]

        # Sublinear TF scaling (1 + log(tf)) dampens very frequent terms
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 2),
            stop_words="english",
            sublinear_tf=True,
            max_features=5000,
        )
        tfidf_matrix = vectorizer.fit_transform(documents)

        # Vector 0 is the rubric; vectors 1..N are the resumes
        rubric_vec = tfidf_matrix[0:1]
        resume_vecs = tfidf_matrix[1:]

        # Compute cosine similarity between each resume and the rubric
        sim_scores = cosine_similarity(resume_vecs, rubric_vec).flatten()

        ranked = sorted(
            zip(candidate_ids, sim_scores),
            key=lambda item: float(item[1]),
            reverse=True,
        )

        return [
            RankedCandidate(candidate_id, round(float(score), 4), index < top_n)
            for index, (candidate_id, score) in enumerate(ranked)
        ]
    except Exception as exc:
        logger.warning("TF-IDF ranker fallback triggered (%s)", exc)
        rubric_tokens = set(rubric_text.lower().split())
        scores_fallback = []
        for cid, txt in candidates.items():
            txt_tokens = set(txt.lower().split())
            overlap = len(rubric_tokens & txt_tokens) / max(len(rubric_tokens), 1)
            scores_fallback.append((cid, round(min(overlap, 1.0), 3)))
        ranked = sorted(scores_fallback, key=lambda item: float(item[1]), reverse=True)
        return [
            RankedCandidate(candidate_id, float(score), index < top_n)
            for index, (candidate_id, score) in enumerate(ranked)
        ]
