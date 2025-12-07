# Error Documentation

## 1. Introduction
This file documents known errors, their context, and resolutions to prevent recurrence.

## 2. Known Issues & Resolutions

### 2.1 Platform Reference Error in React Native
- **Issue:** `ReferenceError: Platform is not defined` in `scan.tsx`.
- **Context:** Occurred when using `Platform.OS` without importing `Platform` from `react-native`.
- **Resolution:** Added `import { Platform } from "react-native";`.
- **Prevention:** Always ensure React Native core modules are imported before use.

### 2.2 Expo Router Layout Context
- **Issue:** Navigation issues or missing context in deeply nested routes.
- **Context:** Expo Router requires proper `_layout.tsx` configuration.
- **Resolution:** Ensure `Stack` or `Slot` is correctly configured in parent directories.

### 2.3 SQL Server Connection Timeout
- **Issue:** Occasional timeouts during heavy sync operations.
- **Context:** Large datasets or network latency.
- **Resolution:** Increased timeout settings in `pyodbc` connection string and implemented retry logic.
