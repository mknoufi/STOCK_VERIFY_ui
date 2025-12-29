# Project Constitution: STOCK_VERIFY_2

This document outlines the core principles and constraints for the Stock Verification System.

## Core Principles

1. **Data Integrity**: The system must ensure that stock counts are accurate and synchronized correctly between MongoDB and SQL Server.
2. **Security First**: All endpoints must be protected by JWT authentication. Role-based access control (RBAC) must be strictly enforced.
3. **Minimal Disruption**: New features should not break existing workflows for staff members in the field.
4. **Performance**: API responses should be optimized for low-latency, especially for barcode lookups.

## Technical Constraints

1. **Backend**: FastAPI (Python 3.10+).
2. **Frontend**: React Native + Expo (TypeScript).
3. **Database**: MongoDB for application state, SQL Server (read-only) for ERP data.
4. **Architecture**: Follow the existing service-oriented architecture.

## Quality Standards

1. **Testing**: All new backend logic must have unit tests.
2. **Documentation**: New APIs must be documented in the code and reflected in the API reference.
3. **Code Style**: Follow PEP 8 for Python and JSDoc/TSDoc for TypeScript.
