import logging
from typing import Any

from fastapi import APIRouter, Depends

from backend.auth.dependencies import get_current_user
from backend.sql_server_connector import sql_connector

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/locations", tags=["Locations"])


@router.get("/warehouses", response_model=list[dict[str, Any]])
def get_warehouses(zone: str = None, current_user: dict = Depends(get_current_user)):
    """Fetch all warehouses from ERP, optionally filtered by zone"""
    try:
        # Ensure connection is alive
        if sql_connector.test_connection():
            warehouses = sql_connector.get_all_warehouses()
            # Basic in-memory filtering if SQL query doesn't support it yet
            if zone:
                z = zone.strip().lower()
                logger.info(
                    f"Filtering warehouses for zone: {zone}. Total warehouses: {len(warehouses)}"
                )

                if "showroom" in z:
                    # Showroom usually contains floors
                    # User Requirement: Explicitly return Ground, First, and Second floors
                    # regardless of what is in the DB for now, as these are the logical units.
                    # We map them to virtual IDs that the frontend might expect (based on fallback).
                    return [
                        {"warehouse_name": "Ground Floor", "id": "fl_ground"},
                        {"warehouse_name": "First Floor", "id": "fl_first"},
                        {"warehouse_name": "Second Floor", "id": "fl_second"},
                    ]
                elif "godown" in z:
                    # Godowns usually contain 'godown'
                    # User Requirement: Explicitly return Top Godown, Main Godown, and Damage Area
                    return [
                        {"warehouse_name": "Top Godown", "id": "wh_top"},
                        {"warehouse_name": "Main Godown", "id": "wh_main"},
                        {"warehouse_name": "Damage Area", "id": "wh_damage"},
                    ]
                else:
                    # Generic filter
                    warehouses = [w for w in warehouses if z in w.get("warehouse_name", "").lower()]

            return warehouses

        # Fallback if connection unavailable
        logger.warning(
            f"SQL Server unavailable, returning default offline warehouses for zone: {zone}"
        )

        if zone and "showroom" in zone.lower():
            return [
                {"warehouse_name": "Ground Floor", "id": "fl_ground"},
                {"warehouse_name": "First Floor", "id": "fl_first"},
                {"warehouse_name": "Second Floor", "id": "fl_second"},
            ]
        elif zone and ("godown" in zone.lower() or "down" in zone.lower()):
            return [
                {"warehouse_name": "Main Godown", "id": "wh_main"},
                {"warehouse_name": "Top Godown", "id": "wh_top"},
                {"warehouse_name": "Damage Area", "id": "wh_damage"},
            ]

        # Default fallback if no zone or unknown zone
        return [
            {"warehouse_name": "Ground Floor", "id": "fl_ground"},
            {"warehouse_name": "First Floor", "id": "fl_first"},
            {"warehouse_name": "Main Godown", "id": "wh_main"},
        ]
    except Exception as e:
        logger.error(f"Error fetching warehouses: {str(e)}")
        # Fallback on error
        return [
            {"warehouse_name": "Ground Floor", "id": "fl_ground"},
            {"warehouse_name": "Main Godown", "id": "wh_main"},
        ]


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
