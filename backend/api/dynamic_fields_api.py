"""
Dynamic Fields API
Endpoints for managing custom dynamic fields for items
"""

import logging
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

from backend.auth import get_current_user
from backend.services.dynamic_fields_service import DynamicFieldsService

logger = logging.getLogger(__name__)

dynamic_fields_router = APIRouter(prefix="/api/dynamic-fields", tags=["dynamic-fields"])

# Global service instance
_dynamic_fields_service = None


def get_dynamic_fields_service() -> DynamicFieldsService:
    """Get global dynamic fields service instance"""
    global _dynamic_fields_service
    if _dynamic_fields_service is None:
        from server import db

        _dynamic_fields_service = DynamicFieldsService(db)
    return _dynamic_fields_service


# Pydantic Models
class FieldDefinitionCreate(BaseModel):
    field_name: str = Field(..., description="Internal field name")
    field_type: str = Field(..., description="Field type")
    display_label: str = Field(..., description="Display label")
    db_mapping: Optional[str] = Field(default=None, description="Database field mapping")
    options: Optional[list[str]] = Field(default=None, description="Options for select types")
    validation_rules: Optional[dict[str, Optional[Any]]] = Field(
        default=None, description="Validation rules"
    )
    default_value: Optional[Any] = Field(default=None, description="Default value")
    required: bool = Field(False, description="Is field required")
    visible: bool = Field(True, description="Is field visible")
    searchable: bool = Field(False, description="Is field searchable")
    in_reports: bool = Field(True, description="Include in reports")
    order: int = Field(0, description="Display order")


class FieldDefinitionUpdate(BaseModel):
    display_label: Optional[str] = None
    options: Optional[list[str]] = None
    validation_rules: Optional[dict[str, Optional[Any]]] = None
    default_value: Optional[Any] = None
    required: Optional[bool] = None
    visible: Optional[bool] = None
    searchable: Optional[bool] = None
    in_reports: Optional[bool] = None
    order: Optional[int] = None
    enabled: Optional[bool] = None


class FieldValueSet(BaseModel):
    item_code: str = Field(..., description="Item code")
    field_name: str = Field(..., description="Field name")
    value: Any = Field(..., description="Field value")


class BulkFieldValueSet(BaseModel):
    item_codes: list[str] = Field(..., description="List of item codes")
    field_values: dict[str, Any] = Field(..., description="Field name-value pairs")


@dynamic_fields_router.post("/definitions")
async def create_field_definition(
    field_data: FieldDefinitionCreate,
    current_user: dict = Depends(get_current_user),
    service: DynamicFieldsService = Depends(get_dynamic_fields_service),
):
    """
    Create a new dynamic field definition

    **Permissions Required:** manage_dynamic_fields

    **Field Types:**
    - text: Single-line text
    - number: Numeric value
    - date: Date only
    - datetime: Date and time
    - select: Single selection from options
    - multiselect: Multiple selections from options
    - boolean: True/False
    - json: Complex JSON data
    - url: URL validation
    - email: Email validation
    - phone: Phone number

    **Example:**
    ```json
    {
      "field_name": "warranty_period",
      "field_type": "select",
      "display_label": "Warranty Period",
      "options": ["1 year", "2 years", "3 years", "5 years"],
      "required": false,
      "visible": true,
      "in_reports": true,
      "order": 10
    }
    ```
    """
    try:
        field_def = await service.create_field_definition(
            field_name=field_data.field_name,
            field_type=field_data.field_type,
            display_label=field_data.display_label,
            db_mapping=field_data.db_mapping,
            options=field_data.options,
            validation_rules=field_data.validation_rules,
            default_value=field_data.default_value,
            required=field_data.required,
            visible=field_data.visible,
            searchable=field_data.searchable,
            in_reports=field_data.in_reports,
            order=field_data.order,
            created_by=current_user.get("username"),
        )

        return {
            "success": True,
            "message": "Field definition created successfully",
            "field": field_def,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error creating field definition: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_fields_router.get("/definitions")
async def get_field_definitions(
    enabled_only: bool = True,
    visible_only: bool = False,
    current_user: dict = Depends(get_current_user),
    service: DynamicFieldsService = Depends(get_dynamic_fields_service),
):
    """
    Get all field definitions

    **Query Parameters:**
    - enabled_only: Only return enabled fields (default: true)
    - visible_only: Only return visible fields (default: false)
    """
    try:
        fields = await service.get_field_definitions(
            enabled_only=enabled_only, visible_only=visible_only
        )

        return {"success": True, "count": len(fields), "fields": fields}

    except Exception as e:
        logger.error(f"Error getting field definitions: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_fields_router.put("/definitions/{field_id}")
async def update_field_definition(
    field_id: str,
    updates: FieldDefinitionUpdate,
    current_user: dict = Depends(get_current_user),
    service: DynamicFieldsService = Depends(get_dynamic_fields_service),
):
    """
    Update a field definition

    **Permissions Required:** manage_dynamic_fields
    """
    try:
        update_dict = updates.dict(exclude_unset=True)

        field_def = await service.update_field_definition(
            field_id=field_id,
            updates=update_dict,
            updated_by=current_user.get("username"),
        )

        return {
            "success": True,
            "message": "Field definition updated successfully",
            "field": field_def,
        }

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error updating field definition: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_fields_router.delete("/definitions/{field_id}")
async def delete_field_definition(
    field_id: str,
    current_user: dict = Depends(get_current_user),
    service: DynamicFieldsService = Depends(get_dynamic_fields_service),
):
    """
    Delete a field definition (soft delete)

    **Permissions Required:** manage_dynamic_fields
    """
    try:
        success = await service.delete_field_definition(field_id)

        if success:
            return {"success": True, "message": "Field definition deleted successfully"}
        else:
            raise HTTPException(status_code=404, detail="Field definition not found")

    except Exception as e:
        logger.error(f"Error deleting field definition: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_fields_router.post("/values")
async def set_field_value(
    field_value: FieldValueSet,
    current_user: dict = Depends(get_current_user),
    service: DynamicFieldsService = Depends(get_dynamic_fields_service),
):
    """
    Set value for a dynamic field on an item

    **Example:**
    ```json
    {
      "item_code": "ITEM001",
      "field_name": "warranty_period",
      "value": "2 years"
    }
    ```
    """
    try:
        result = await service.set_field_value(
            item_code=field_value.item_code,
            field_name=field_value.field_name,
            value=field_value.value,
            set_by=current_user.get("username"),
        )

        return {
            "success": True,
            "message": "Field value set successfully",
            "field_value": result,
        }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error setting field value: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_fields_router.post("/values/bulk")
async def set_field_values_bulk(
    bulk_data: BulkFieldValueSet,
    current_user: dict = Depends(get_current_user),
    service: DynamicFieldsService = Depends(get_dynamic_fields_service),
):
    """
    Set field values for multiple items at once

    **Permissions Required:** bulk_edit_items

    **Example:**
    ```json
    {
      "item_codes": ["ITEM001", "ITEM002", "ITEM003"],
      "field_values": {
        "warranty_period": "2 years",
        "supplier": "ABC Corp"
      }
    }
    ```
    """
    try:
        results = []
        errors = []

        for item_code in bulk_data.item_codes:
            for field_name, value in bulk_data.field_values.items():
                try:
                    result = await service.set_field_value(
                        item_code=item_code,
                        field_name=field_name,
                        value=value,
                        set_by=current_user.get("username"),
                    )
                    results.append(result)
                except Exception as e:
                    errors.append(
                        {
                            "item_code": item_code,
                            "field_name": field_name,
                            "error": str(e),
                        }
                    )

        return {
            "success": True,
            "message": f"Processed {len(bulk_data.item_codes)} items",
            "successful": len(results),
            "failed": len(errors),
            "errors": errors if errors else None,
        }

    except Exception as e:
        logger.error(f"Error setting bulk field values: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_fields_router.get("/values/{item_code}")
async def get_item_field_values(
    item_code: str,
    current_user: dict = Depends(get_current_user),
    service: DynamicFieldsService = Depends(get_dynamic_fields_service),
):
    """
    Get all dynamic field values for an item

    **Returns:**
    ```json
    {
      "warranty_period": {
        "value": "2 years",
        "set_by": "admin",
        "updated_at": "2025-01-01T10:00:00Z"
      },
      "supplier": {
        "value": "ABC Corp",
        "set_by": "supervisor1",
        "updated_at": "2025-01-02T14:30:00Z"
      }
    }
    ```
    """
    try:
        values = await service.get_item_field_values(item_code)

        return {
            "success": True,
            "item_code": item_code,
            "field_count": len(values),
            "fields": values,
        }

    except Exception as e:
        logger.error(f"Error getting item field values: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_fields_router.get("/items")
async def get_items_with_fields(
    field_name: Optional[str] = None,
    field_value: Optional[str] = None,
    limit: int = 100,
    skip: int = 0,
    current_user: dict = Depends(get_current_user),
    service: DynamicFieldsService = Depends(get_dynamic_fields_service),
):
    """
    Get items filtered by dynamic field values

    **Query Parameters:**
    - field_name: Filter by specific field name
    - field_value: Filter by specific field value
    - limit: Maximum results (default: 100)
    - skip: Skip results (default: 0)

    **Example:** `/api/dynamic-fields/items?field_name=warranty_period&field_value=2 years`
    """
    try:
        field_filters: Optional[dict[str, Any]] = None
        if field_name and field_value:
            field_filters = {field_name: field_value}

        items = await service.get_items_with_fields(
            field_filters=field_filters, limit=limit, skip=skip
        )

        return {"success": True, "count": len(items), "items": items}

    except Exception as e:
        logger.error(f"Error getting items with fields: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")


@dynamic_fields_router.get("/statistics/{field_name}")
async def get_field_statistics(
    field_name: str,
    current_user: dict = Depends(get_current_user),
    service: DynamicFieldsService = Depends(get_dynamic_fields_service),
):
    """
    Get statistics for a specific dynamic field

    **Returns statistics like:**
    - Total items with this field
    - Min/Max/Avg for numeric fields
    - Value distribution for select fields
    """
    try:
        stats = await service.get_field_statistics(field_name)

        return {"success": True, "statistics": stats}

    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error getting field statistics: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error")
