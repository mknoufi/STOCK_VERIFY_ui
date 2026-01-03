"""
Input Validation Utilities
Centralized validators for security-critical input validation
"""

import logging
import re
from typing import Any, Optional

logger = logging.getLogger(__name__)

# MongoDB operators that could enable NoSQL injection
MONGO_OPERATORS = frozenset(
    {
        "$eq",
        "$ne",
        "$gt",
        "$gte",
        "$lt",
        "$lte",
        "$in",
        "$nin",
        "$and",
        "$or",
        "$not",
        "$nor",
        "$exists",
        "$type",
        "$expr",
        "$where",
        "$regex",
        "$text",
        "$mod",
        "$all",
        "$elemMatch",
        "$size",
        "$slice",
        "$meta",
        "$comment",
        "$jsonSchema",
        "$geoIntersects",
        "$geoWithin",
        "$near",
        "$nearSphere",
        "$bitsAllClear",
        "$bitsAllSet",
        "$bitsAnyClear",
        "$bitsAnySet",
    }
)

# Pattern: lowercase letter start, then lowercase alphanumeric/underscore, max 63 chars
FIELD_NAME_PATTERN = re.compile(r"^[a-z][a-z0-9_]{0,62}$")

# SQL injection patterns to block
SQL_DANGEROUS_CHARS = frozenset({";", "--", "/*", "*/", "'", '"'})


class ValidationError(ValueError):
    """Raised when input validation fails."""

    def __init__(self, message: str, field: str, value: str):
        super().__init__(message)
        self.field = field
        self.value = value[:50] if value else ""  # Truncate for safe logging


def validate_mongo_field_name(field_name: str) -> str:
    """Validate a MongoDB field name against injection attacks.

    Args:
        field_name: The proposed field name

    Returns:
        The validated field name (unchanged if valid)

    Raises:
        ValidationError: If field name is invalid
    """
    if not field_name:
        raise ValidationError("Field name cannot be empty", "field_name", "")

    # Check MongoDB operator injection
    if field_name.startswith("$") or field_name.lower() in MONGO_OPERATORS:
        logger.warning(f"Rejected MongoDB operator in field name: {field_name[:50]}")
        raise ValidationError(
            "Field name cannot be a MongoDB operator",
            "field_name",
            field_name,
        )

    # Check pattern
    if not FIELD_NAME_PATTERN.match(field_name):
        raise ValidationError(
            "Field name must start with lowercase letter, contain only "
            "lowercase alphanumeric and underscore, max 63 characters",
            "field_name",
            field_name,
        )

    # Block consecutive underscores
    if "__" in field_name:
        raise ValidationError(
            "Field name cannot contain consecutive underscores",
            "field_name",
            field_name,
        )

    # Block reserved MongoDB field prefixes
    if field_name.startswith("_"):
        raise ValidationError(
            "Field name cannot start with underscore",
            "field_name",
            field_name,
        )

    return field_name


def validate_sql_identifier(name: str, max_length: int = 128) -> str:
    """Validate a SQL Server identifier.

    Args:
        name: The identifier (table/column name)
        max_length: Maximum allowed length (default 128 for SQL Server)

    Returns:
        The validated identifier

    Raises:
        ValidationError: If identifier is invalid
    """
    if not name:
        raise ValidationError("Identifier cannot be empty", "identifier", "")

    if len(name) > max_length:
        raise ValidationError(
            f"Identifier exceeds {max_length} characters",
            "identifier",
            name,
        )

    # Block brackets (prevents escape injection)
    if "[" in name or "]" in name:
        raise ValidationError(
            "Identifier cannot contain brackets",
            "identifier",
            name,
        )

    # Block dangerous SQL characters
    for char in SQL_DANGEROUS_CHARS:
        if char in name:
            logger.warning(f"Rejected SQL dangerous char in identifier: {char[:2]}")
            raise ValidationError(
                "Identifier contains forbidden character",
                "identifier",
                name,
            )

    # Allowlist pattern (alphanumeric, space, underscore)
    if not re.fullmatch(r"[A-Za-z0-9_ ]+", name):
        raise ValidationError(
            "Identifier must contain only alphanumeric, space, underscore",
            "identifier",
            name,
        )

    return name


def sanitize_for_display(value: str, max_length: int = 100) -> str:
    """Sanitize a value for safe display in error messages.

    Args:
        value: The value to sanitize
        max_length: Maximum length to return

    Returns:
        Sanitized value safe for logging/display
    """
    if not value:
        return ""

    # Truncate
    result = value[:max_length]

    # Remove control characters
    result = "".join(c for c in result if c.isprintable())

    return result


# ==========================================
# MongoDB Save Verification Utilities
# ==========================================


class MongoSaveError(Exception):
    """Raised when a MongoDB save operation fails or cannot be verified."""

    def __init__(
        self,
        message: str,
        operation: str,
        collection: str,
        details: Optional[dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.operation = operation
        self.collection = collection
        self.details = details or {}


def verify_insert_result(
    result: Any,
    collection_name: str,
    document_id: Optional[str] = None,
) -> str:
    """Verify that an insert_one operation was successful.

    Args:
        result: The InsertOneResult from MongoDB
        collection_name: Name of the collection for error reporting
        document_id: Optional expected document ID

    Returns:
        The inserted document ID as string

    Raises:
        MongoSaveError: If the insert was not acknowledged or failed
    """
    if result is None:
        logger.error(f"MongoDB insert to {collection_name} returned None")
        raise MongoSaveError(
            "Insert operation returned no result",
            "insert_one",
            collection_name,
            {"expected_id": document_id},
        )

    # Check acknowledged (for write concern)
    if hasattr(result, "acknowledged") and not result.acknowledged:
        logger.error(f"MongoDB insert to {collection_name} was not acknowledged")
        raise MongoSaveError(
            "Insert operation was not acknowledged by MongoDB",
            "insert_one",
            collection_name,
            {"acknowledged": False},
        )

    # Check inserted_id exists
    if not hasattr(result, "inserted_id") or result.inserted_id is None:
        logger.error(f"MongoDB insert to {collection_name} has no inserted_id")
        raise MongoSaveError(
            "Insert operation did not return an inserted_id",
            "insert_one",
            collection_name,
        )

    inserted_id = str(result.inserted_id)
    logger.debug(f"MongoDB insert verified: {collection_name} -> {inserted_id}")
    return inserted_id


def verify_update_result(
    result,
    collection_name: str,
    expected_match: int = 1,
    require_modification: bool = False,
) -> dict:
    """Verify that an update_one/update_many operation was successful.

    Args:
        result: The UpdateResult from MongoDB
        collection_name: Name of the collection for error reporting
        expected_match: Expected number of matched documents (default 1)
        require_modification: If True, require at least one document was modified

    Returns:
        Dict with matched_count, modified_count, and upserted_id (if any)

    Raises:
        MongoSaveError: If the update did not match expected documents
    """
    if result is None:
        logger.error(f"MongoDB update to {collection_name} returned None")
        raise MongoSaveError(
            "Update operation returned no result",
            "update",
            collection_name,
        )

    # Check acknowledged
    if hasattr(result, "acknowledged") and not result.acknowledged:
        logger.error(f"MongoDB update to {collection_name} was not acknowledged")
        raise MongoSaveError(
            "Update operation was not acknowledged by MongoDB",
            "update",
            collection_name,
            {"acknowledged": False},
        )

    matched = getattr(result, "matched_count", 0)
    modified = getattr(result, "modified_count", 0)
    upserted_id = getattr(result, "upserted_id", None)

    # For upsert operations, upserted_id indicates success
    if upserted_id is not None:
        logger.debug(f"MongoDB upsert verified: {collection_name} -> {upserted_id}")
        return {
            "matched_count": matched,
            "modified_count": modified,
            "upserted_id": str(upserted_id),
            "was_upsert": True,
        }

    # Check matched count
    if expected_match > 0 and matched < expected_match:
        logger.warning(
            f"MongoDB update to {collection_name}: expected {expected_match} matches, got {matched}"
        )
        raise MongoSaveError(
            f"Update matched {matched} documents, expected {expected_match}",
            "update",
            collection_name,
            {"matched_count": matched, "expected": expected_match},
        )

    # Check modification if required
    if require_modification and modified == 0:
        logger.warning(f"MongoDB update to {collection_name}: no documents modified")
        raise MongoSaveError(
            "Update matched documents but none were modified",
            "update",
            collection_name,
            {"matched_count": matched, "modified_count": modified},
        )

    logger.debug(
        f"MongoDB update verified: {collection_name} matched={matched} modified={modified}"
    )
    return {
        "matched_count": matched,
        "modified_count": modified,
        "upserted_id": None,
        "was_upsert": False,
    }


def verify_delete_result(result, collection_name: str, expected_count: int = 1) -> int:
    """Verify that a delete_one/delete_many operation was successful.

    Args:
        result: The DeleteResult from MongoDB
        collection_name: Name of the collection for error reporting
        expected_count: Expected number of deleted documents

    Returns:
        The number of deleted documents

    Raises:
        MongoSaveError: If the delete count doesn't match expected
    """
    if result is None:
        logger.error(f"MongoDB delete from {collection_name} returned None")  # nosec
        raise MongoSaveError(
            "Delete operation returned no result",
            "delete",
            collection_name,
        )

    # Check acknowledged
    if hasattr(result, "acknowledged") and not result.acknowledged:
        logger.error(f"MongoDB delete from {collection_name} was not acknowledged")  # nosec
        raise MongoSaveError(
            "Delete operation was not acknowledged by MongoDB",
            "delete",
            collection_name,
            {"acknowledged": False},
        )

    deleted = getattr(result, "deleted_count", 0)

    if expected_count > 0 and deleted < expected_count:
        logger.warning(
            f"MongoDB delete from {collection_name}: "  # nosec
            f"expected {expected_count}, deleted {deleted}"
        )
        raise MongoSaveError(
            f"Deleted {deleted} documents, expected {expected_count}",
            "delete",
            collection_name,
            {"deleted_count": deleted, "expected": expected_count},
        )

    logger.debug(f"MongoDB delete verified: {collection_name} deleted={deleted}")
    return deleted


async def verify_document_exists(
    collection,
    filter_query: dict,
    collection_name: str,
) -> bool:
    """Verify that a document exists in the collection after save.

    Args:
        collection: The MongoDB collection object
        filter_query: Query to find the document
        collection_name: Name of the collection for error reporting

    Returns:
        True if document exists

    Raises:
        MongoSaveError: If document is not found
    """
    try:
        doc = await collection.find_one(filter_query, {"_id": 1})
        if doc is None:
            logger.error(f"Document not found in {collection_name} after save")
            raise MongoSaveError(
                "Document not found after save operation",
                "verify",
                collection_name,
                {"filter": str(filter_query)[:100]},
            )
        logger.debug(f"Document verified in {collection_name}")
        return True
    except MongoSaveError:
        raise
    except Exception as e:
        logger.error(f"Error verifying document in {collection_name}: {e}")
        raise MongoSaveError(
            f"Failed to verify document: {str(e)}",
            "verify",
            collection_name,
        ) from e


async def save_with_verification(
    collection,
    document: dict,
    collection_name: str,
    id_field: str = "id",
) -> dict:
    """Insert a document and verify it was saved successfully.

    Args:
        collection: The MongoDB collection object
        document: The document to insert
        collection_name: Name of the collection for logging
        id_field: The field name used as document ID (default "id")

    Returns:
        The saved document with inserted_id

    Raises:
        MongoSaveError: If save or verification fails
    """
    try:
        result = await collection.insert_one(document)
        inserted_id = verify_insert_result(result, collection_name)

        # Verify document exists
        verify_query = {"_id": result.inserted_id}
        await verify_document_exists(collection, verify_query, collection_name)

        document["_mongo_id"] = inserted_id
        logger.info(f"Document saved and verified in {collection_name}: {inserted_id}")
        return document

    except MongoSaveError:
        raise
    except Exception as e:
        logger.error(f"Error saving document to {collection_name}: {e}")
        raise MongoSaveError(
            f"Failed to save document: {str(e)}",
            "save_with_verification",
            collection_name,
        ) from e


async def update_with_verification(
    collection,
    filter_query: dict,
    update_doc: dict,
    collection_name: str,
    upsert: bool = False,
) -> dict:
    """Update a document and verify the update was successful.

    Args:
        collection: The MongoDB collection object
        filter_query: Query to find the document to update
        update_doc: The update operations (e.g., {"$set": {...}})
        collection_name: Name of the collection for logging
        upsert: Whether to insert if document doesn't exist

    Returns:
        Dict with update result info

    Raises:
        MongoSaveError: If update or verification fails
    """
    try:
        result = await collection.update_one(filter_query, update_doc, upsert=upsert)

        # For upsert, we expect either a match or an upsert
        expected_match = 0 if upsert else 1
        update_info = verify_update_result(result, collection_name, expected_match=expected_match)

        # Verify document exists after update
        await verify_document_exists(collection, filter_query, collection_name)

        logger.info(f"Document updated and verified in {collection_name}")
        return update_info

    except MongoSaveError:
        raise
    except Exception as e:
        logger.error(f"Error updating document in {collection_name}: {e}")
        raise MongoSaveError(
            f"Failed to update document: {str(e)}",
            "update_with_verification",
            collection_name,
        ) from e
