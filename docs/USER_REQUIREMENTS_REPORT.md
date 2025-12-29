# User Requirements Report
**Date:** December 21, 2025
**Status:** Implemented & Verified

## 1. Executive Summary
This report outlines the user requirements gathered and implemented during the recent modernization and audit phase of the Stock Verify application. The focus has been on optimizing the search experience for staff, improving UI flexibility, and ensuring backend logic robustness.

## 2. Functional Requirements

### 2.1 Search & Scanning Logic
**Requirement:** Optimize search behavior to reduce noise and improve speed.
*   **Trigger Condition:** Search must only initiate after the user has typed at least **3 characters**.
*   **Prefix-Based Routing:**
    *   **IF** input starts with `51`, `52`, or `53`: Search by **Barcode** ONLY.
    *   **ELSE**: Search by **Item Name** ONLY.
*   **Exclusions:** Do not search by "Item Code" or other fields to prevent irrelevant results.

### 2.2 User Interface (Frontend)
**Requirement:** Enhance the dashboard and list management.
*   **Active Sections:** The Home screen must support displaying multiple active sections simultaneously.
*   **Draggable Lists:** Users must be able to reorder items in the active sections list via drag-and-drop.
*   **Layout Alignment:** Ensure consistent padding, margins, and alignment across the scanning and verification screens.

### 2.3 Stock Management
**Requirement:** Ensure stock refresh operations work for all item types.
*   **Item Code Compatibility:** The `refresh-stock` feature must accept generic numeric item codes (e.g., "1001") even if they do not conform to the strict 6-digit barcode format (51/52/53) used for scanning.

### 2.4 Authentication
**Requirement:** Scalable PIN login for staff.
*   **Capacity:** The system must support PIN-based login for the entire staff base (increased limit from 100 to 1000+ users).

## 3. Technical & System Requirements

### 3.1 Database Mapping (SQL Server)
**Requirement:** Robust handling of legacy ERP schemas.
*   **Identifier Support:** The system must correctly handle SQL Server column names that contain **spaces** (e.g., `[Item Name]`).
*   **Query Safety:** Dynamic SQL generation for mapping tests must be syntactically correct (fixed duplicate `TOP 5` clauses) and secure against injection.

### 3.2 Validation Logic
**Requirement:** Context-aware validation.
*   **Strict vs. Lenient:**
    *   **Public Scanning:** Enforce strict barcode rules (6 digits, specific prefixes).
    *   **Internal Operations:** Allow alphanumeric or non-standard numeric codes for internal lookups and stock refreshes.

## 4. Implementation Status
| Requirement                    | Status     | Notes                                              |
| :----------------------------- | :--------- | :------------------------------------------------- |
| Search Optimization (51/52/53) | ✅ **Done** | Implemented in `enhanced_item_api.py` & `scan.tsx` |
| UI Draggable Lists             | ✅ **Done** | Implemented in Frontend                            |
| Stock Refresh Logic            | ✅ **Done** | Fixed in `erp_api.py`                              |
| SQL Mapping Fixes              | ✅ **Done** | Fixed in `mapping_api.py`                          |
| PIN Login Scaling              | ✅ **Done** | Fixed in `auth.py`                                 |
