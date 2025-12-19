"""
MongoDB Index Definitions
Optimized indexes for 20 concurrent users and fast queries
"""

# Index definitions: (field_spec, options)
# field_spec: List of (field, direction) tuples
# options: Index options dict

INDEXES: dict[str, list[tuple[list[tuple[str, int]], dict]]] = {
    # Verification Records Collection
    "verification_records": [
        # Unique client record ID
        (
            [("client_record_id", 1)],
            {"unique": True, "name": "idx_client_record_id"},
        ),
        # Session queries
        (
            [("session_id", 1), ("created_at", -1)],
            {"name": "idx_session_timeline"},
        ),
        # Rack and floor queries
        ([("rack_id", 1), ("floor", 1)], {"name": "idx_rack_floor"}),
        # Item code lookups
        ([("item_code", 1), ("sync_status", 1)], {"name": "idx_item_sync"}),
        # Sync monitoring
        (
            [("sync_status", 1), ("updated_at", -1)],
            {"name": "idx_sync_monitoring"},
        ),
        # Serial number lookups (sparse index)
        (
            [("serial_numbers", 1)],
            {"name": "idx_serial_numbers", "sparse": True},
        ),
        # Status and timestamp
        ([("status", 1), ("created_at", -1)], {"name": "idx_status_time"}),
    ],
    # Verification Sessions Collection
    "verification_sessions": [
        # Unique session ID
        ([("session_id", 1)], {"unique": True, "name": "idx_session_id"}),
        # User sessions
        ([("user_id", 1), ("status", 1)], {"name": "idx_user_sessions"}),
        # Rack sessions
        ([("rack_id", 1), ("status", 1)], {"name": "idx_rack_sessions"}),
        # Active sessions
        (
            [("status", 1), ("last_heartbeat", -1)],
            {"name": "idx_active_sessions"},
        ),
        # Floor sessions
        ([("floor", 1), ("status", 1)], {"name": "idx_floor_sessions"}),
        # Completion tracking
        ([("completed_at", -1)], {"name": "idx_completed", "sparse": True}),
    ],
    # Rack Registry Collection
    "rack_registry": [
        # Unique rack ID
        ([("rack_id", 1)], {"unique": True, "name": "idx_rack_id"}),
        # Available racks
        ([("status", 1), ("floor", 1)], {"name": "idx_available_racks"}),
        # User's claimed racks
        ([("claimed_by", 1), ("status", 1)], {"name": "idx_user_racks"}),
        # Lock expiration (TTL-like)
        (
            [("lock_expires_at", 1)],
            {"name": "idx_lock_expiry", "sparse": True},
        ),
        # Session mapping
        ([("session_id", 1)], {"name": "idx_rack_session", "sparse": True}),
    ],
    # Item Serials Collection
    "item_serials": [
        # Unique serial number
        ([("serial_number", 1)], {"unique": True, "name": "idx_serial_unique"}),
        # Item code lookups
        ([("item_code", 1)], {"name": "idx_serial_item"}),
        # Session serials
        ([("session_id", 1), ("created_at", -1)], {"name": "idx_session_serials"}),
        # Rack serials
        ([("rack_id", 1)], {"name": "idx_rack_serials"}),
    ],
    # Report Snapshots Collection
    "report_snapshots": [
        # Unique snapshot ID
        ([("snapshot_id", 1)], {"unique": True, "name": "idx_snapshot_id"}),
        # User snapshots
        ([("created_by", 1), ("created_at", -1)], {"name": "idx_user_snapshots"}),
        # Snapshot type
        ([("snapshot_type", 1), ("created_at", -1)], {"name": "idx_type_time"}),
        # Query hash for deduplication
        ([("query_hash", 1)], {"name": "idx_query_hash", "sparse": True}),
    ],
    # Report Compare Jobs Collection
    "report_compare_jobs": [
        # Job ID
        ([("job_id", 1)], {"unique": True, "name": "idx_job_id"}),
        # User jobs
        ([("created_by", 1), ("created_at", -1)], {"name": "idx_user_jobs"}),
        # Status tracking
        ([("status", 1), ("created_at", -1)], {"name": "idx_job_status"}),
        # Snapshot references
        ([("snapshot_a_id", 1), ("snapshot_b_id", 1)], {"name": "idx_snapshots"}),
    ],
    # Count Lines Collection (existing)
    "count_lines": [
        # Session count lines
        ([("session_id", 1), ("created_at", -1)], {"name": "idx_session_counts"}),
        # Item lookups
        ([("item_code", 1), ("session_id", 1)], {"name": "idx_item_session"}),
        # Verification status
        ([("verified", 1), ("session_id", 1)], {"name": "idx_verified"}),
        # Rack count lines
        ([("rack_id", 1), ("session_id", 1)], {"name": "idx_rack_counts"}),
    ],
    # Sessions Collection (existing)
    "sessions": [
        # Session ID
        ([("session_id", 1)], {"unique": True, "name": "idx_session"}),
        # User sessions
        ([("created_by", 1), ("created_at", -1)], {"name": "idx_user_time"}),
        # Status
        ([("status", 1), ("created_at", -1)], {"name": "idx_status"}),
        # Warehouse
        ([("warehouse", 1), ("status", 1)], {"name": "idx_warehouse_status"}),
    ],
    # ERP Items Collection (existing)
    "erp_items": [
        # Item code
        ([("item_code", 1)], {"unique": True, "name": "idx_item_code"}),
        # Barcode lookups
        ([("barcode", 1)], {"name": "idx_barcode"}),
        ([("autobarcode", 1)], {"name": "idx_autobarcode", "sparse": True}),
        # Category searches
        ([("category", 1), ("subcategory", 1)], {"name": "idx_category"}),
        # Warehouse items
        ([("warehouse", 1), ("item_code", 1)], {"name": "idx_warehouse_item"}),
        # Stock level queries
        ([("stock_qty", 1)], {"name": "idx_stock"}),
        # Floor and rack
        ([("floor", 1), ("rack", 1)], {"name": "idx_location"}),
        # Text search
        ([("item_name", "text"), ("description", "text")], {"name": "idx_text_search"}),
    ],
    # Activity Logs Collection
    "activity_logs": [
        # User activity
        ([("user", 1), ("timestamp", -1)], {"name": "idx_user_activity"}),
        # Action type
        ([("action", 1), ("timestamp", -1)], {"name": "idx_action_time"}),
        # Status filter
        ([("status", 1), ("timestamp", -1)], {"name": "idx_status_activity"}),
        # Date range queries
        ([("timestamp", -1)], {"name": "idx_timestamp"}),
    ],
    # Error Logs Collection
    "error_logs": [
        # Severity
        ([("severity", 1), ("timestamp", -1)], {"name": "idx_severity"}),
        # Error type
        ([("error_type", 1), ("timestamp", -1)], {"name": "idx_error_type"}),
        # Endpoint errors
        ([("endpoint", 1), ("timestamp", -1)], {"name": "idx_endpoint"}),
        # Resolution status
        ([("resolved", 1), ("timestamp", -1)], {"name": "idx_resolved"}),
    ],
}


async def create_indexes(db) -> dict[str, int]:
    """
    Create all indexes defined in INDEXES

    Args:
        db: AsyncIOMotorDatabase instance

    Returns:
        Dict with collection names and index counts
    """
    import logging

    logger = logging.getLogger(__name__)
    results = {}

    for collection_name, index_specs in INDEXES.items():
        try:
            collection = db[collection_name]
            created = 0

            for field_spec, options in index_specs:
                try:
                    await collection.create_index(field_spec, **options)
                    created += 1
                except Exception as e:
                    logger.warning(
                        f"Failed to create index {options.get('name')} "
                        f"on {collection_name}: {str(e)}"
                    )

            results[collection_name] = created
            logger.info(f"✓ Created {created} indexes on {collection_name}")

        except Exception as e:
            logger.error(f"Failed to create indexes on {collection_name}: {str(e)}")
            results[collection_name] = 0

    return results


async def drop_all_indexes(db) -> dict[str, bool]:
    """
    Drop all indexes (except _id) from all collections
    USE WITH CAUTION - for development/testing only

    Args:
        db: AsyncIOMotorDatabase instance

    Returns:
        Dict with collection names and success status
    """
    import logging

    logger = logging.getLogger(__name__)
    results = {}

    for collection_name in INDEXES.keys():
        try:
            collection = db[collection_name]
            await collection.drop_indexes()
            results[collection_name] = True
            logger.info(f"✓ Dropped indexes on {collection_name}")
        except Exception as e:
            logger.error(f"Failed to drop indexes on {collection_name}: {str(e)}")
            results[collection_name] = False

    return results


async def get_index_stats(db) -> dict[str, list[dict]]:
    """
    Get index statistics for all collections

    Args:
        db: AsyncIOMotorDatabase instance

    Returns:
        Dict with collection names and index info
    """
    stats = {}

    for collection_name in INDEXES.keys():
        try:
            collection = db[collection_name]
            index_info = await collection.index_information()
            stats[collection_name] = [
                {
                    "name": name,
                    "keys": info.get("key"),
                    "unique": info.get("unique", False),
                    "sparse": info.get("sparse", False),
                }
                for name, info in index_info.items()
            ]
        except Exception:
            stats[collection_name] = []

    return stats
