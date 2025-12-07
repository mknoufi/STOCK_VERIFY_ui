# Lessons Learned

## 1. Introduction
This file captures project intelligence, patterns, and preferences to improve future development.

## 2. Project Patterns

### 2.1 UI/UX Preferences
- **Modern Styling:** The user prefers a "Premium" look with clean lines, proper spacing, and custom components (`PremiumCard`, `PremiumInput`).
- **Feedback:** Immediate visual feedback (alerts, loading states) is crucial for the mobile app user experience.
- **Simplicity:** For the scanning workflow, less is more. Removing unnecessary steps (like the extra verification button) improves efficiency.

### 2.2 Architecture
- **Dual-DB is Effective:** The separation of MongoDB (Operational) and SQL Server (ERP) has proven effective for performance and reliability.
- **Sync Logic:** Periodic sync is robust, but real-time checks on scan are necessary for critical accuracy.

### 2.3 Development Workflow
- **Memory Bank:** Maintaining up-to-date documentation in `memory/` helps context retention across sessions.
- **Incremental UI Updates:** Small, targeted UI updates are easier to manage and verify than massive overhauls.

## 3. Tool Usage
- **Expo:** Great for rapid development, but requires careful management of native dependencies and permissions (Camera).
- **FastAPI:** Excellent performance and developer experience for the backend API.

## 4. Admin Panel Development (December 2025)

### 4.1 Architecture Decisions
- **Vite + React + TypeScript:** Chosen for fast development with HMR, type safety, and modern tooling.
- **React Router v6:** Clean, declarative routing with protected routes pattern.
- **No UI Library:** Custom CSS keeps bundle size small and provides full control over styling.

### 4.2 API Integration Patterns
- **Singleton API Service:** Centralized HTTP client in `services/api.ts` handles auth tokens, error handling, and base URL configuration.
- **Graceful Fallback:** API calls fall back to mock data when backend is unavailable - allows frontend development without backend running.
- **Token Management:** JWT tokens stored in localStorage with automatic refresh/redirect on 401.

### 4.3 Form Accessibility
- **Always link labels to inputs:** Use `id` on inputs and `htmlFor` on labels for screen readers.
- **Use aria-labelledby for toggle switches:** When a label wraps an input (toggle pattern), use `aria-labelledby` referencing a separate `<span>` with the label text.
- **Prefer explicit associations:** `aria-label` as fallback for controls without visible labels.

### 4.4 State Management
- **Context for Auth:** AuthContext provides login/logout/user state across the app.
- **Local state for pages:** Each page manages its own data fetching with useState/useEffect.
- **Custom hooks (useApi):** Reusable hook pattern for loading/error/refetch states.

### 4.5 Backend API Endpoints
Key endpoints discovered during integration:
- `POST /api/auth/login` - User authentication
- `GET /api/admin/control/system/stats` - Dashboard statistics
- `GET /api/v2/erp/items/verifications` - Verification records
- `PATCH /api/v2/erp/items/{item_code}/verify` - Mark item verified
- `GET /api/analytics/variance-trends` - Variance trend data
- `GET /api/analytics/staff-performance` - Staff metrics

### 4.6 Code Organization
```
admin-panel/src/
├── components/       # Reusable UI components
│   ├── Layout/       # Header, Sidebar, DashboardLayout
│   └── ProtectedRoute.tsx
├── contexts/         # React Context providers
├── hooks/            # Custom React hooks
├── pages/            # Route-level components
├── services/         # API client layer
├── types/            # TypeScript interfaces
└── router.tsx        # Route configuration
```

### 4.7 Styling Patterns
- **CSS files per component:** `ComponentName.css` alongside `ComponentName.tsx`
- **Consistent class naming:** `.component-name`, `.component-name-element`
- **CSS variables for theming:** `--primary-color`, `--text-color`, etc.
- **Responsive grids:** `grid-template-columns: repeat(auto-fit, minmax(240px, 1fr))`
