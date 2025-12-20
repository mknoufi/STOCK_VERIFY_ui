"""
AI Search Service
Handles semantic search using sentence-transformers.
"""

import logging
from typing import Any, Optional

import numpy as np

# Configure logging
logger = logging.getLogger("ai_search")


class AISearchService:
    _instance = None
    _model = None
    _embeddings_cache: dict[str, np.ndarray] = {}

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def initialize_model(self):
        """
        Lazy load the model to avoid startup overhead if not used.
        """
        if self._model is not None:
            return

        try:
            from sentence_transformers import SentenceTransformer

            logger.info("Loading semantic search model (all-MiniLM-L6-v2)...")
            # fast, lightweight model
            self._model = SentenceTransformer("all-MiniLM-L6-v2")
            logger.info("Semantic search model loaded successfully.")
        except ImportError:
            logger.error(
                "sentence-transformers not installed. Semantic search disabled."
            )
            self._model = None
        except Exception as e:
            logger.error(f"Failed to load semantic model: {e}")
            self._model = None

    def encode(self, text: str) -> Optional[np.ndarray]:
        """
        Generate embedding for a single string.
        """
        self.initialize_model()
        if self._model is None:
            return None

        try:
            return self._model.encode(text, convert_to_numpy=True)
        except Exception as e:
            logger.error(f"Encoding error: {e}")
            return None

    def search_rerank(
        self, query: str, candidates: list[dict[str, Any]], top_k: int = 20
    ) -> list[dict[str, Any]]:
        """
        Rorank a list of candidate items based on semantic similarity to the query.
        """
        self.initialize_model()
        if self._model is None or not candidates:
            return candidates[:top_k]

        try:
            from sentence_transformers import util

            # 1. Encode Query
            query_embedding = self._model.encode(query, convert_to_tensor=True)

            # 2. Prepare Candidate Texts
            # Combine name + category for better context
            candidate_texts = [
                f"{item.get('item_name', '')} {item.get('category', '')} {item.get('subcategory', '')}"
                for item in candidates
            ]

            # 3. Encode Candidates (in batch)
            # Ideally we'd cache these, but for "reranking" small sets (e.g. 50-100), live encoding is OK.
            # For larger sets, we need pre-computed embeddings.
            candidate_embeddings = self._model.encode(
                candidate_texts, convert_to_tensor=True
            )

            # 4. Calculate Cosine Similarity
            scores = util.cos_sim(query_embedding, candidate_embeddings)[0]

            # 5. Zip and Sort
            scored_candidates = []
            for idx, score in enumerate(scores):
                scored_candidates.append((score.item(), candidates[idx]))

            # Sort descending
            scored_candidates.sort(key=lambda x: x[0], reverse=True)

            # Return top_k
            return [x[1] for x in scored_candidates[:top_k]]

        except Exception as e:
            logger.error(f"Semantic reranking failed: {e}")
            return candidates[:top_k]


# Global instance
ai_search_service = AISearchService.get_instance()
