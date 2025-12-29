import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends

from backend.auth.dependencies import get_current_user
from backend.sql_server_connector import sql_connector
from backend.db.runtime import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/locations", tags=["Locations"])


@router.get("/warehouses", response_model=list[dict[str, Any]])
async def get_warehouses(
    zone: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Fetch warehouses with priority.

    SQL -> Mongo -> default (create missing in Mongo).
    """

    def _defaults_for_zone(z: Optional[str]) -> list[dict[str, str]]:
        if not z:
            return [
                {
                    "warehouse_name": "Ground Floor",
                    "id": "fl_ground",
                    "zone": "showroom",
                },
                {
                    "warehouse_name": "First Floor",
                    "id": "fl_first",
                    "zone": "showroom",
                },
                {
                    "warehouse_name": "Second Floor",
                    "id": "fl_second",
                    "zone": "showroom",
                },
                {
                    "warehouse_name": "Main Godown",
                    "id": "wh_main",
                    "zone": "godown",
                },
                {
                    "warehouse_name": "Top Godown",
                    "id": "wh_top",
                    "zone": "godown",
                },
                {
                    "warehouse_name": "Damage Area",
                    "id": "wh_damage",
                    "zone": "godown",
                },
            ]

        z_l = z.lower()
        if "showroom" in z_l:
            return [
                {
                    "warehouse_name": "Ground Floor",
                    "id": "fl_ground",
                    "zone": "showroom",
                },
                {
                    "warehouse_name": "First Floor",
                    "id": "fl_first",
                    "zone": "showroom",
                },
                {
                    "warehouse_name": "Second Floor",
                    "id": "fl_second",
                    "zone": "showroom",
                },
            ]
        if "godown" in z_l or "down" in z_l:
            return [
                {
                    "warehouse_name": "Main Godown",
                    "id": "wh_main",
                    "zone": "godown",
                },
                {
                    "warehouse_name": "Top Godown",
                    "id": "wh_top",
                    "zone": "godown",
                },
                {
                    "warehouse_name": "Damage Area",
                    "id": "wh_damage",
                    "zone": "godown",
                },
            ]
        return []

    try:
        # 1) Try SQL first
        if sql_connector.test_connection():
            warehouses = sql_connector.get_all_warehouses()
            if zone:
                z = zone.strip().lower()
                warehouses = [w for w in warehouses if z in w.get("warehouse_name", "").lower()]
                # Explicit overrides for expected floor lists
                if "showroom" in z and not warehouses:
                    warehouses = _defaults_for_zone(zone)
                elif "godown" in z and not warehouses:
                    warehouses = _defaults_for_zone(zone)
            if warehouses:
                return warehouses

        logger.warning("SQL unavailable or empty result, falling back to Mongo/default")

        try:
            db = get_db()
        except RuntimeError:
            db = None

        if db is None:
            logger.warning("MongoDB not initialised; returning default warehouses")
            return _defaults_for_zone(zone)

        # 2) Try Mongo cache
        query = {}
        if zone:
            query["zone"] = {"$regex": zone, "$options": "i"}
        mongo_warehouses = await db["warehouses"].find(query).to_list(length=50)

        if not mongo_warehouses:
            # 3) Seed defaults into Mongo if missing
            defaults = _defaults_for_zone(zone)
            if defaults:
                await db["warehouses"].insert_many(defaults)
                logger.info(
                    "Seeded default warehouses into MongoDB for zone %s",
                    zone or "*",
                )
                return defaults
            return []

        sanitized = []
        for w in mongo_warehouses:
            item = {k: v for k, v in w.items() if k != "_id"}
            if "id" not in item and "_id" in w:
                item["id"] = str(w["_id"])
            sanitized.append(item)

        return sanitized

    except Exception as e:
        logger.error(f"Error fetching warehouses: {str(e)}")
        return _defaults_for_zone(zone)


@router.get("/zones", response_model=list[dict[str, Any]])
def get_zones(current_user: dict = Depends(get_current_user)):
    """Fetch all zones (floors) from ERP, with offline fallback"""
    try:
        # Check if ERP sync is enabled/connected
        if sql_connector.test_connection():
            zones = sql_connector.get_all_zones()
            return zones

        # Offline Fallback
        logger.warning("SQL Server unavailable, returning default offline zones")
        return [
            {"zone_name": "Showroom", "id": "zone_showroom"},
            {"zone_name": "Godown", "id": "zone_godown"},
        ]

    except Exception as e:
        logger.error(f"Error fetching zones: {str(e)}")
        # In case of any error (even unexpected), fallback for development
        return [
            {"zone_name": "Showroom", "id": "zone_showroom"},
            {"zone_name": "Godown", "id": "zone_godown"},
        ]
