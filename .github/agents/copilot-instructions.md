# STOCK_VERIFY_2-db-maped Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-23

## Active Technologies
- Python 3.9+ (backend), TypeScript 5.x (frontend) (002-system-modernization-and-enhancements)
- Python 3.10+ (backend), TypeScript 5.0+ (frontend) + FastAPI, Motor (MongoDB async), pyodbc (SQL Server read-only), React Native + Expo (004-app-logic-docs)
- MongoDB (system of record), SQL Server (read-only ERP source), optional Redis for cache/locks (004-app-logic-docs)
- Python 3.10+ (backend), TypeScript (frontend; Expo/React Native) + FastAPI, Motor (MongoDB), pyodbc (SQL Server read-only), Expo Router, Zustand, Axios, React Query (004-app-logic-docs)
- MongoDB (source of truth for app state), SQL Server (read-only ERP), optional Redis (cache/locks), frontend local storage (MMKV) (004-app-logic-docs)

- Python 3.10+, TypeScript 5.0+ (React Native/Expo) + FastAPI, Motor (MongoDB), pyodbc (SQL Server), Expo, Zustand, Axios, React Native Reanimated (002-system-modernization-and-enhancements)

## Project Structure

```text
src/
tests/
```

## Commands

cd src [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] pytest [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] ruff check .

## Code Style

Python 3.10+, TypeScript 5.0+ (React Native/Expo): Follow standard conventions

## Recent Changes
- 004-app-logic-docs: Added Python 3.10+ (backend), TypeScript (frontend; Expo/React Native) + FastAPI, Motor (MongoDB), pyodbc (SQL Server read-only), Expo Router, Zustand, Axios, React Query
- 004-app-logic-docs: Added Python 3.10+ (backend), TypeScript 5.0+ (frontend) + FastAPI, Motor (MongoDB async), pyodbc (SQL Server read-only), React Native + Expo
- 002-system-modernization-and-enhancements: Added [if applicable, e.g., PostgreSQL, CoreData, files or N/A]


<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
