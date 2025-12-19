# Frontend Documentation - Stock Verification System

**Version:** 1.0.0
**Last Updated:** 2025-01-28
**Framework:** React Native + Expo Router
**Platform:** iOS, Android, Web

## Overview

The Stock Verification System frontend is a cross-platform React Native application built with Expo Router. It provides a comprehensive solution for inventory management and stock counting operations with support for offline functionality, real-time synchronization, and role-based access control.

### Key Characteristics

- **Cross-platform:** iOS, Android, and Web
- **Offline-first:** Full functionality without internet connectivity
- **Real-time sync:** Automatic data synchronization when online
- **Role-based:** Three-tier permission system (Staff, Supervisor, Admin)
- **Modern UI:** Dark theme with premium design system

## Technology Stack

### Core Dependencies
- React Native 0.81.5
- React 19.1.0
- Expo SDK ~54.0.25
- Expo Router ~6.0.15
- TypeScript ~5.9.2

### State Management
- Zustand 5.0.8
- React Query (TanStack) ^5.90.11
- React Hook Form ^7.52.1

### Storage
- MMKV ^4.0.1 (30x faster than AsyncStorage)
- AsyncStorage 2.2.0

## Project Structure

```
frontend/
├── app/              # Expo Router pages
├── components/       # Reusable UI components
├── services/         # Business logic & API services
├── hooks/            # Custom React hooks
├── store/            # Zustand state stores
├── types/            # TypeScript definitions
├── utils/            # Utility functions
├── constants/        # App constants
├── theme/            # Theme system
└── styles/           # Global styles
```

## User Roles

### Staff Role
- Create and manage counting sessions
- Scan barcodes and count items
- Enter quantities, serial numbers, MRP
- Capture photos for proof
- View session history

### Supervisor Role
- All Staff capabilities
- View all sessions across staff
- Monitor variances
- Approve/reject count lines
- Manage export schedules
- View analytics and reports
- Resolve sync conflicts

### Admin Role
- All Supervisor capabilities
- System administration
- User permission management
- Security monitoring
- SQL Server configuration
- System metrics monitoring

## Core Features

1. **Authentication & Authorization** - JWT tokens, auto-logout, role-based access
2. **Barcode Scanning** - Camera-based, 12+ formats, continuous/single mode
3. **Stock Counting** - Full workflow with serials, MRP, photos, variance tracking
4. **Session Management** - Create, track, bulk operations
5. **Item Management** - Search, MRP updates, stock refresh
6. **Analytics & Reporting** - Comprehensive dashboards
7. **Export Functionality** - Manual & scheduled exports
8. **Sync & Conflict Resolution** - Automatic sync, conflict handling
9. **Offline Queue Management** - Queue operations, auto-retry
10. **Activity & Error Logging** - Comprehensive logging

## Component Library

### Layout Components (6)
- Container, Section, Screen
- StaffLayout, SupervisorLayout, AdminLayout

### Scanning Components (10)
- BarcodeScanner, ItemSearch, ItemDisplay
- QuantityInputForm, SerialNumberEntry
- MRPVariantSelector, LocationInput
- PhotoCapture, VarianceReasonModal, SessionStartModal

### UI Components (15+)
- Button, ModernButton, Input, Card, ModernCard
- DataTable, Pagination, SearchAutocomplete
- Modal, BottomSheet, Toast
- LoadingSpinner, LoadingSkeleton, EmptyState

### Chart Components (6)
- BarChart, LineChart, PieChart
- SimpleBarChart, SimpleLineChart, SimplePieChart

## Services & APIs

### Core Services (6)
- api.ts - Main API service layer
- httpClient.ts - HTTP client configuration
- networkService.ts - Network status management
- syncService.ts - Data synchronization
- offlineQueue.ts - Offline operation queue
- offlineStorage.ts - Local data storage

### Enhanced Services (5)
- enhancedApi.ts, enhancedApiClient.ts
- enhancedDatabaseApi.ts
- enhancedSearchService.ts
- enhancedFeatures.ts

### Specialized Services (9)
- itemVerificationApi.ts
- enrichmentApi.ts
- notesApi.ts
- exportService.ts
- validationService.ts
- errorHandler.ts, errorRecovery.ts
- autoRecovery.ts, autoErrorFinder.ts

## State Management

### Zustand Stores
- authStore - Authentication state
- networkStore - Network status
- settingsStore - App settings

### React Query
- Server state management
- Automatic caching
- Background refetching
- Optimistic updates

## Navigation

### Expo Router (File-based Routing)
- Role-based route protection
- Authentication guards
- Automatic redirection

## Offline Capabilities

### Offline-First Architecture
- Local-first data storage
- Queue operations when offline
- Automatic sync when online
- Conflict resolution

### Offline Features
- Barcode scanning (cached items)
- Item search (cached items)
- Count line creation
- Session creation
- View cached data

## Performance Optimizations

- React.memo, useMemo, useCallback
- FlashList for high-performance lists
- Request debouncing (500ms)
- Request caching (React Query)
- MMKV storage (30x faster)
- Image optimization

## Security Features

- JWT token-based authentication
- Secure token storage
- Auto-logout (15 minutes)
- Role-based access control
- Input validation
- SQL injection prevention
- XSS prevention
- Security monitoring

## Development

### Getting Started
```bash
cd frontend
npm install
npm start
```

### Testing
```bash
npm test
```

### Build
```bash
npm run build:web
```

## Summary Statistics

- **Total Screens:** 30+ screens
- **Total Components:** 60+ reusable components
- **Total Services:** 33 service modules
- **Total Functions:** 29+ core functions
- **Total API Endpoints:** 50+ endpoints
- **User Roles:** 3 (Staff, Supervisor, Admin)
- **Supported Platforms:** iOS, Android, Web

---

**Document Version:** 1.0.0
**Last Updated:** 2025-01-28
