"""
Search Service for Optimized Item Lookup

Provides debounce-friendly search with relevance scoring, caching,
and pagination. Designed for frontend integration with 300ms debounce.

Scoring Algorithm:
  - Exact barcode match: 1000 points (highest priority)
  - Partial barcode match: 500 + similarity score
  - Exact item_code match: 400 points
  - Item name prefix match: 300 + position bonus
  - Item name contains: 200 + similarity score
  - Fuzzy name match: similarity score (0-100)
"""

import logging
from dataclasses import dataclass
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from rapidfuzz import fuzz

logger = logging.getLogger(__name__)


@dataclass
class SearchResult:
    """Search result with relevance score"""

    id: str
    item_name: str
    item_code: Optional[str]
    barcode: Optional[str]
    stock_qty: float
    mrp: Optional[float]
    category: Optional[str]
    subcategory: Optional[str]
    warehouse: Optional[str]
    uom_name: Optional[str]
    relevance_score: float
    match_type: str  # 'exact_barcode', 'partial_barcode', 'exact_code', 'name_prefix', 'name_contains', 'fuzzy'
    sale_price: Optional[float] = None
    manual_barcode: Optional[str] = None
    unit2_barcode: Optional[str] = None
    unit_m_barcode: Optional[str] = None
    batch_id: Optional[str] = None


@dataclass
class SearchResponse:
    """Paginated search response"""

    items: list[SearchResult]
    total: int
    page: int
    page_size: int
    has_more: bool
    query: str


class SearchService:
    """
    Optimized search service with relevance scoring.

    Features:
    - Exact barcode matching prioritized (scanner use case)
    - Fuzzy matching for partial inputs
    - Pagination for large result sets
    - Redis caching for repeat queries (optional)
    """

    # Scoring weights
    EXACT_BARCODE_SCORE = 1000
    PARTIAL_BARCODE_SCORE = 500
    EXACT_CODE_SCORE = 400
    NAME_PREFIX_SCORE = 300
    NAME_CONTAINS_SCORE = 200

    # Search limits
    MAX_CANDIDATES = 200  # Max items to fetch for scoring
    MIN_QUERY_LENGTH = 2  # Minimum chars before search

    def __init__(self, db: AsyncIOMotorDatabase, cache: Optional[Any] = None):
        self.db = db
        self.cache = cache  # Optional Redis cache

    async def search(
        self,
        query: str,
        page: int = 1,
        page_size: int = 20,
        search_fields: Optional[list[str]] = None,
    ) -> SearchResponse:
        """
        Execute optimized search with relevance scoring.

        Args:
            query: Search query (barcode, name, or code)
            page: Page number (1-indexed)
            page_size: Items per page (max 50)
            search_fields: Optional field filter (default: all)

        Returns:
            SearchResponse with scored and paginated results
        """
        query = query.strip()

        # Empty or too short query
        if len(query) < self.MIN_QUERY_LENGTH:
            return SearchResponse(
                items=[],
                total=0,
                page=page,
                page_size=page_size,
                has_more=False,
                query=query,
            )

        # Clamp page_size
        page_size = min(max(1, page_size), 50)

        # Try cache first (if available)
        cache_key = f"search:{query}:{page}:{page_size}"
        if self.cache:
            try:
                cached = await self.cache.get(cache_key)
                if cached:
                    logger.debug(f"Cache hit for query: {query}")
                    return cached
            except Exception as e:
                logger.warning(f"Cache read failed: {e}")

        # Determine if this looks like a barcode (numeric, 6+ digits)
        is_barcode_query = query.isdigit() and len(query) >= 6

        # Build MongoDB query
        mongo_query = self._build_query(query, is_barcode_query, search_fields)

        # Fetch candidates
        candidates = await self._fetch_candidates(mongo_query)

        # Score and rank candidates
        scored_items = self._score_candidates(candidates, query, is_barcode_query)

        # Paginate
        total = len(scored_items)
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size
        page_items = scored_items[start_idx:end_idx]

        response = SearchResponse(
            items=page_items,
            total=total,
            page=page,
            page_size=page_size,
            has_more=end_idx < total,
            query=query,
        )

        # Cache result (if available)
        if self.cache and total > 0:
            try:
                await self.cache.setex(cache_key, 60, response)  # 60 second TTL
            except Exception as e:
                logger.warning(f"Cache write failed: {e}")

        return response

    def _build_query(
        self,
        query: str,
        is_barcode: bool,
        search_fields: Optional[list[str]] = None,
    ) -> dict:
        """Build MongoDB query for candidate fetching"""

        fields = search_fields or ["barcode", "item_code", "item_name"]

        if is_barcode:
            # Prioritize exact and prefix barcode matches
            return {
                "$or": [
                    {"barcode": query},  # Exact match
                    {"barcode": {"$regex": f"^{query}"}},  # Prefix match
                    {"item_code": query},  # Exact code match
                ]
            }

        # Text search for names
        or_conditions = []

        if "barcode" in fields:
            or_conditions.append({"barcode": {"$regex": query, "$options": "i"}})

        if "item_code" in fields:
            or_conditions.append({"item_code": {"$regex": query, "$options": "i"}})

        if "item_name" in fields:
            or_conditions.append({"item_name": {"$regex": query, "$options": "i"}})

        return {"$or": or_conditions} if or_conditions else {}

    async def _fetch_candidates(self, query: dict) -> list[dict]:
        """Fetch candidate items from MongoDB"""

        if not query:
            return []

        try:
            cursor = self.db.erp_items.find(query).limit(self.MAX_CANDIDATES)
            candidates = await cursor.to_list(length=self.MAX_CANDIDATES)
            return candidates
        except Exception as e:
            logger.error(f"Failed to fetch candidates: {e}")
            return []

    def _score_candidates(
        self,
        candidates: list[dict],
        query: str,
        is_barcode: bool,
    ) -> list[SearchResult]:
        """Score and rank candidates by relevance, removing true duplicates"""

        scored = []
        seen_items: set[tuple[str, str, str]] = (
            set()
        )  # (barcode, item_code, mrp) tuple for deduplication
        query_lower = query.lower()

        for item in candidates:
            score, match_type = self._calculate_score(
                item, query, query_lower, is_barcode
            )

            if score > 0:
                # Create deduplication key: barcode + item_code + mrp
                # Items with same name but different barcode/MRP will still appear separately
                barcode = str(item.get("barcode", ""))
                item_code = str(item.get("item_code", ""))
                mrp = str(item.get("mrp", ""))
                dedup_key = (barcode, item_code, mrp)

                # Skip if we've already seen this exact item variant
                if dedup_key in seen_items:
                    continue
                seen_items.add(dedup_key)

                scored.append(
                    SearchResult(
                        id=str(item.get("_id", "")),
                        item_name=item.get("item_name", ""),
                        item_code=(
                            str(item.get("item_code"))
                            if item.get("item_code") is not None
                            else None
                        ),
                        barcode=(
                            str(item.get("barcode"))
                            if item.get("barcode") is not None
                            else None
                        ),
                        stock_qty=float(item.get("stock_qty", 0.0)),
                        mrp=item.get("mrp"),
                        sale_price=item.get("sale_price"),
                        category=(
                            str(item.get("category"))
                            if item.get("category") is not None
                            else None
                        ),
                        subcategory=(
                            str(item.get("subcategory"))
                            if item.get("subcategory") is not None
                            else None
                        ),
                        warehouse=(
                            str(item.get("warehouse"))
                            if item.get("warehouse") is not None
                            else None
                        ),
                        uom_name=(
                            str(item.get("uom_name"))
                            if item.get("uom_name") is not None
                            else None
                        ),
                        manual_barcode=(
                            str(item.get("manual_barcode"))
                            if item.get("manual_barcode") is not None
                            else None
                        ),
                        unit2_barcode=(
                            str(item.get("unit2_barcode"))
                            if item.get("unit2_barcode") is not None
                            else None
                        ),
                        unit_m_barcode=(
                            str(item.get("unit_m_barcode"))
                            if item.get("unit_m_barcode") is not None
                            else None
                        ),
                        batch_id=(
                            str(item.get("batch_id"))
                            if item.get("batch_id") is not None
                            else None
                        ),
                        relevance_score=score,
                        match_type=match_type,
                    )
                )

        # Sort by score descending, then by item_name ascending
        # We use negative score for ascending sort to combine with item_name
        scored.sort(key=lambda x: (-x.relevance_score, x.item_name))

        return scored

    def _calculate_score(
        self,
        item: dict,
        query: str,
        query_lower: str,
        is_barcode: bool,
    ) -> tuple[float, str]:
        """
        Calculate relevance score for an item.

        Returns:
            Tuple of (score, match_type)
        """
        barcode = str(item.get("barcode", ""))
        item_code = str(item.get("item_code", ""))
        item_name = item.get("item_name", "")
        name_lower = item_name.lower()

        # Priority 1: Exact barcode match
        if barcode == query:
            return (self.EXACT_BARCODE_SCORE, "exact_barcode")

        # Priority 2: Partial barcode match (prefix)
        if barcode.startswith(query):
            similarity = len(query) / len(barcode) * 100
            return (self.PARTIAL_BARCODE_SCORE + similarity, "partial_barcode")

        # Priority 3: Barcode contains query (for scanning partial reads)
        if is_barcode and query in barcode:
            similarity = len(query) / len(barcode) * 100
            return (self.PARTIAL_BARCODE_SCORE + similarity * 0.5, "partial_barcode")

        # Priority 4: Exact item_code match
        if item_code.lower() == query_lower:
            return (self.EXACT_CODE_SCORE, "exact_code")

        # Priority 5: Name prefix match
        if name_lower.startswith(query_lower):
            position_bonus = 50  # Bonus for matching from start
            return (self.NAME_PREFIX_SCORE + position_bonus, "name_prefix")

        # Priority 6: Name contains query
        if query_lower in name_lower:
            position = name_lower.index(query_lower)
            position_bonus = max(0, 50 - position)  # Earlier = better
            return (self.NAME_CONTAINS_SCORE + position_bonus, "name_contains")

        # Priority 7: Fuzzy match on name
        fuzzy_score = fuzz.partial_ratio(query_lower, name_lower)
        if fuzzy_score > 60:  # Threshold for fuzzy matches
            return (fuzzy_score, "fuzzy")

        # No match
        return (0, "none")

    async def get_suggestions(
        self,
        prefix: str,
        limit: int = 5,
    ) -> list[str]:
        """
        Get autocomplete suggestions for a prefix.

        Args:
            prefix: Search prefix
            limit: Max suggestions to return

        Returns:
            List of suggested item names/barcodes
        """
        if len(prefix) < 2:
            return []

        try:
            # Get name suggestions
            pipeline = [
                {"$match": {"item_name": {"$regex": f"^{prefix}", "$options": "i"}}},
                {"$group": {"_id": "$item_name"}},
                {"$limit": limit},
            ]
            cursor = self.db.erp_items.aggregate(pipeline)
            results = await cursor.to_list(length=limit)
            return [r["_id"] for r in results]
        except Exception as e:
            logger.error(f"Failed to get suggestions: {e}")
            return []


# Singleton instance (initialized with db in server startup)
_search_service: Optional[SearchService] = None


def get_search_service() -> SearchService:
    """Get the search service singleton, lazily initializing if needed.

    The startup hook should call ``init_search_service`` with the database.
    However, in some dev runs (hot reloads, missing startup), the singleton
    can be empty, which previously caused a 503 ("Search service unavailable").
    We now attempt a best-effort lazy init from the active DB to avoid hard
    failures. If DB is unavailable, we still surface a RuntimeError.
    """
    global _search_service

    if _search_service is None:
        try:
            from backend.db.runtime import get_db

            db = get_db()
            _search_service = SearchService(db)
            logger.warning("SearchService lazily initialized at runtime")
        except Exception as exc:
            raise RuntimeError(
                "SearchService not initialized. Call init_search_service first."
            ) from exc

    return _search_service


def init_search_service(
    db: AsyncIOMotorDatabase, cache: Optional[Any] = None
) -> SearchService:
    """Initialize the search service singleton"""
    global _search_service
    _search_service = SearchService(db, cache)
    return _search_service
