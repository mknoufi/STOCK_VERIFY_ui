"""
Data Governance Service
Data retention, GDPR compliance, and data lifecycle management
"""

import logging
from datetime import datetime, timedelta
from enum import Enum
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class DataCategory(str, Enum):
    """Data categories for governance"""

    PERSONAL = "personal"  # PII data
    SENSITIVE = "sensitive"  # Sensitive business data
    OPERATIONAL = "operational"  # Operational data
    AUDIT = "audit"  # Audit logs
    ANALYTICS = "analytics"  # Analytics/metrics


class RetentionPolicy(BaseModel):
    """Data retention policy"""

    category: DataCategory
    collection_name: str
    retention_days: int
    archive_before_delete: bool = True
    description: Optional[str] = None


class DataSubjectRequest(BaseModel):
    """GDPR data subject request"""

    id: Optional[str] = None
    request_type: str  # access, rectification, erasure, portability
    subject_id: str  # User ID or email
    subject_email: Optional[str] = None
    status: str = "pending"  # pending, processing, completed, denied
    requested_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None
    processed_by: Optional[str] = None
    notes: Optional[str] = None
    data_exported: Optional[dict[str, Optional[Any]]] = None


class DataGovernanceService:
    """
    Enterprise data governance service for:
    - Data retention policies
    - GDPR/CCPA compliance
    - Data subject requests
    - Data classification
    - Audit trail for data operations
    """

    # Default retention policies
    DEFAULT_POLICIES = [
        RetentionPolicy(
            category=DataCategory.AUDIT,
            collection_name="enterprise_audit_logs",
            retention_days=365,
            archive_before_delete=True,
            description="Audit logs retained for 1 year for compliance",
        ),
        RetentionPolicy(
            category=DataCategory.OPERATIONAL,
            collection_name="activity_logs",
            retention_days=90,
            archive_before_delete=False,
            description="Activity logs retained for 90 days",
        ),
        RetentionPolicy(
            category=DataCategory.OPERATIONAL,
            collection_name="security_events",
            retention_days=180,
            archive_before_delete=True,
            description="Security events retained for 180 days",
        ),
        RetentionPolicy(
            category=DataCategory.ANALYTICS,
            collection_name="metrics",
            retention_days=365,
            archive_before_delete=False,
            description="Metrics retained for 1 year",
        ),
    ]

    def __init__(self, mongo_db: AsyncIOMotorDatabase):
        self.db = mongo_db
        self.policies_collection = mongo_db.data_retention_policies
        self.requests_collection = mongo_db.data_subject_requests
        self.archive_collection = mongo_db.data_archive

    async def initialize(self):
        """Initialize governance service"""
        # Create indexes
        await self.requests_collection.create_index("subject_id")
        await self.requests_collection.create_index("status")
        await self.requests_collection.create_index("requested_at")
        await self.archive_collection.create_index("archived_at")
        await self.archive_collection.create_index("source_collection")

        # Load default policies
        for policy in self.DEFAULT_POLICIES:
            await self.policies_collection.update_one(
                {"collection_name": policy.collection_name},
                {"$setOnInsert": policy.model_dump()},
                upsert=True,
            )

        logger.info("Data governance service initialized")

    # =========================================================================
    # RETENTION POLICIES
    # =========================================================================

    async def get_retention_policies(self) -> list[RetentionPolicy]:
        """Get all retention policies"""
        policies = []
        async for doc in self.policies_collection.find():
            doc.pop("_id", None)
            policies.append(RetentionPolicy(**doc))
        return policies

    async def set_retention_policy(self, policy: RetentionPolicy) -> bool:
        """Set or update a retention policy"""
        try:
            await self.policies_collection.update_one(
                {"collection_name": policy.collection_name},
                {"$set": policy.model_dump()},
                upsert=True,
            )
            logger.info(
                f"Retention policy set for {policy.collection_name}: {policy.retention_days} days"
            )
            return True
        except Exception as e:
            logger.error(f"Failed to set retention policy: {e}")
            return False

    async def apply_retention_policies(self) -> dict[str, Any]:
        """Apply all retention policies (delete expired data)"""
        results: dict[str, Any] = {}

        async for policy_doc in self.policies_collection.find():
            policy = RetentionPolicy(**{k: v for k, v in policy_doc.items() if k != "_id"})

            cutoff_date = datetime.utcnow() - timedelta(days=policy.retention_days)
            collection = self.db[policy.collection_name]

            try:
                # Find documents to delete
                query = {"timestamp": {"$lt": cutoff_date}}
                count = await collection.count_documents(query)

                if count == 0:
                    results[policy.collection_name] = {"deleted": 0, "archived": 0}
                    continue

                archived = 0
                if policy.archive_before_delete:
                    # Archive before deletion
                    cursor = collection.find(query)
                    archive_docs = []
                    async for doc in cursor:
                        archive_docs.append(
                            {
                                "source_collection": policy.collection_name,
                                "archived_at": datetime.utcnow(),
                                "original_id": str(doc.pop("_id")),
                                "data": doc,
                            }
                        )
                        if len(archive_docs) >= 1000:
                            await self.archive_collection.insert_many(archive_docs)
                            archived += len(archive_docs)
                            archive_docs = []

                    if archive_docs:
                        await self.archive_collection.insert_many(archive_docs)
                        archived += len(archive_docs)

                # Delete expired documents
                result = await collection.delete_many(query)

                results[policy.collection_name] = {
                    "deleted": result.deleted_count,
                    "archived": archived,
                }

                logger.info(
                    f"Retention policy applied to {policy.collection_name}: "
                    f"deleted={result.deleted_count}, archived={archived}"
                )

            except Exception as e:
                logger.error(f"Failed to apply retention for {policy.collection_name}: {e}")
                results[policy.collection_name] = {"error": str(e)}

        return results

    # =========================================================================
    # GDPR DATA SUBJECT REQUESTS
    # =========================================================================

    async def create_data_subject_request(
        self,
        request_type: str,
        subject_id: str,
        subject_email: Optional[str] = None,
        notes: Optional[str] = None,
    ) -> str:
        """Create a new data subject request (GDPR Art. 15-20)"""
        if request_type not in [
            "access",
            "rectification",
            "erasure",
            "portability",
            "restriction",
        ]:
            raise ValueError(f"Invalid request type: {request_type}")

        request = DataSubjectRequest(
            request_type=request_type,
            subject_id=subject_id,
            subject_email=subject_email,
            notes=notes,
        )

        result = await self.requests_collection.insert_one(request.model_dump())
        logger.info(f"Data subject request created: {request_type} for {subject_id}")

        return str(result.inserted_id)

    async def process_access_request(self, request_id: str, processed_by: str) -> dict[str, Any]:
        """
        Process a data access request (GDPR Art. 15)
        Returns all data associated with the subject
        """
        request_doc = await self.requests_collection.find_one({"_id": request_id})
        if not request_doc:
            raise ValueError("Request not found")

        subject_id = request_doc["subject_id"]

        # Collect data from all relevant collections
        data = {}

        # User data
        user = await self.db.users.find_one({"_id": subject_id})
        if user:
            user["_id"] = str(user["_id"])
            # Remove sensitive fields
            user.pop("password_hash", None)
            data["user_profile"] = user

        # Activity logs
        activities = []
        async for doc in self.db.activity_logs.find({"user": subject_id}).limit(1000):
            doc["_id"] = str(doc["_id"])
            activities.append(doc)
        data["activity_logs"] = activities

        # Count sessions
        sessions = []
        async for doc in self.db.count_lines.find({"user": subject_id}).limit(1000):
            doc["_id"] = str(doc["_id"])
            sessions.append(doc)
        data["count_sessions"] = sessions

        # Update request status
        await self.requests_collection.update_one(
            {"_id": request_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow(),
                    "processed_by": processed_by,
                    "data_exported": {"collections_included": list(data.keys())},
                }
            },
        )

        return data

    async def process_erasure_request(
        self,
        request_id: str,
        processed_by: str,
        collections_to_erase: Optional[list[str]] = None,
    ) -> dict[str, int]:
        """
        Process a data erasure request (GDPR Art. 17 - Right to be forgotten)
        """
        request_doc = await self.requests_collection.find_one({"_id": request_id})
        if not request_doc:
            raise ValueError("Request not found")

        subject_id = request_doc["subject_id"]

        # Collections to process
        default_collections = ["activity_logs", "count_lines"]
        collections = collections_to_erase or default_collections

        results = {}

        for collection_name in collections:
            try:
                collection = self.db[collection_name]

                # Archive before deletion
                cursor = collection.find({"user": subject_id})
                archive_docs = []
                async for doc in cursor:
                    archive_docs.append(
                        {
                            "source_collection": collection_name,
                            "archived_at": datetime.utcnow(),
                            "erasure_request_id": request_id,
                            "original_id": str(doc.pop("_id")),
                            "data": doc,
                        }
                    )

                if archive_docs:
                    await self.archive_collection.insert_many(archive_docs)

                # Delete data
                result = await collection.delete_many({"user": subject_id})
                results[collection_name] = result.deleted_count

            except Exception as e:
                logger.error(f"Erasure failed for {collection_name}: {e}")
                results[collection_name] = -1

        # Anonymize user record instead of deleting
        await self.db.users.update_one(
            {"_id": subject_id},
            {
                "$set": {
                    "username": f"deleted_user_{subject_id[:8]}",
                    "email": None,
                    "full_name": "Deleted User",
                    "deleted_at": datetime.utcnow(),
                    "deletion_request_id": request_id,
                }
            },
        )
        results["user_anonymized"] = 1

        # Update request status
        await self.requests_collection.update_one(
            {"_id": request_id},
            {
                "$set": {
                    "status": "completed",
                    "completed_at": datetime.utcnow(),
                    "processed_by": processed_by,
                    "data_exported": {"deleted_counts": results},
                }
            },
        )

        logger.info(f"Erasure request completed for {subject_id}: {results}")
        return results

    async def get_pending_requests(self) -> list[dict[str, Any]]:
        """Get all pending data subject requests"""
        requests = []
        async for doc in self.requests_collection.find({"status": "pending"}):
            doc["id"] = str(doc.pop("_id"))
            requests.append(doc)
        return requests

    async def get_request_status(self, request_id: str) -> Optional[dict[str, Optional[Any]]]:
        """Get status of a data subject request"""
        doc = await self.requests_collection.find_one({"_id": request_id})
        if doc:
            doc["id"] = str(doc.pop("_id"))
            return doc
        return None

    # =========================================================================
    # DATA CLASSIFICATION
    # =========================================================================

    async def get_data_inventory(self) -> dict[str, Any]:
        """Get inventory of all data collections and their classifications"""
        inventory = {}

        # Get all collections
        collections = await self.db.list_collection_names()

        for name in collections:
            if name.startswith("system."):
                continue

            collection = self.db[name]
            count = await collection.count_documents({})

            # Determine category based on collection name
            category = DataCategory.OPERATIONAL.value
            if "audit" in name.lower():
                category = DataCategory.AUDIT.value
            elif "user" in name.lower() or "auth" in name.lower():
                category = DataCategory.PERSONAL.value
            elif "metric" in name.lower() or "analytic" in name.lower():
                category = DataCategory.ANALYTICS.value

            # Get retention policy if exists
            policy = await self.policies_collection.find_one({"collection_name": name})

            inventory[name] = {
                "document_count": count,
                "category": category,
                "has_retention_policy": policy is not None,
                "retention_days": policy.get("retention_days") if policy else None,
            }

        return inventory

    async def get_compliance_report(self) -> dict[str, Any]:
        """Generate compliance report"""
        inventory = await self.get_data_inventory()
        policies = await self.get_retention_policies()
        pending_requests = await self.get_pending_requests()

        # Calculate statistics
        total_collections = len(inventory)
        collections_with_policies = sum(1 for v in inventory.values() if v["has_retention_policy"])
        personal_data_collections = sum(
            1 for v in inventory.values() if v["category"] == DataCategory.PERSONAL.value
        )

        return {
            "generated_at": datetime.utcnow().isoformat(),
            "summary": {
                "total_collections": total_collections,
                "collections_with_retention_policy": collections_with_policies,
                "policy_coverage_percent": (
                    round(collections_with_policies / total_collections * 100, 1)
                    if total_collections > 0
                    else 0
                ),
                "personal_data_collections": personal_data_collections,
                "pending_data_requests": len(pending_requests),
            },
            "data_inventory": inventory,
            "retention_policies": [p.model_dump() for p in policies],
            "pending_requests": pending_requests,
            "recommendations": self._generate_recommendations(inventory, policies),
        }

    def _generate_recommendations(
        self, inventory: dict[str, Any], policies: list[RetentionPolicy]
    ) -> list[str]:
        """Generate compliance recommendations"""
        recommendations = []

        policy_collections = {p.collection_name for p in policies}

        for name, info in inventory.items():
            if not info["has_retention_policy"]:
                recommendations.append(
                    f"Collection '{name}' has no retention policy. "
                    f"Consider adding one for compliance."
                )

            if info["category"] == DataCategory.PERSONAL.value:
                if name not in policy_collections:
                    recommendations.append(
                        f"Personal data collection '{name}' should have explicit retention policy for GDPR compliance."
                    )

        return recommendations
