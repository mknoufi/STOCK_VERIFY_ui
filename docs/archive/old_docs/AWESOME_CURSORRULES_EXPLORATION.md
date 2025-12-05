# Awesome Cursor Rules - Exploration Summary

## 📚 Repository Overview

**Source:** https://github.com/PatrickJS/awesome-cursorrules
**Total Rules:** 170+ cursor rule templates
**Purpose:** Enhance Cursor AI editor with project-specific best practices

---

## 🎯 Most Relevant Rules for STOCK_VERIFY_2

### 1. **React Native Expo Rules**
**Path:** `rules/react-native-expo-cursorrules-prompt-file/`

**Key Learnings:**
✅ Use functional components with hooks
✅ Implement Expo Router for navigation
✅ Use TypeScript for type safety
✅ Leverage Expo SDK features (SecureStore, Notifications, OTA)
✅ Implement proper offline support
✅ Use NativeWind for styling

**Recommended Structure:**
```
assets/
src/
  components/
  screens/
  navigation/
  hooks/
  utils/
app/
  _layout.tsx
  index.tsx
```

---

### 2. **Python FastAPI Best Practices**
**Path:** `rules/python-fastapi-best-practices-cursorrules-prompt-f/`

**Key Learnings:**
✅ Write concise, technical Python code
✅ Use functional, declarative programming
✅ Prefer Pydantic models for validation
✅ Use async/await for I/O operations
✅ Implement proper error handling (HTTPException)
✅ Use type hints for all functions
✅ Optimize with caching strategies

**File Structure:**
```
routers/
utilities/
models/
schemas/
middleware/
```

---

### 3. **TypeScript React Standards**
**Path:** `rules/typescript-react-cursorrules-prompt-file/`

**Key Learnings:**
✅ Use React.FC for functional components
✅ Implement proper TypeScript interfaces
✅ Use React.memo for optimization
✅ Create custom hooks for reusable logic
✅ Enable TypeScript strict mode
✅ Use React.lazy and Suspense
✅ Implement error boundaries

---

### 4. **Python Best Practices (General)**
**Path:** `rules/python-cursorrules-prompt-file-best-practices/`

**Key Learnings:**
✅ Clear project structure (src, tests, docs, config)
✅ Modular design with separate files
✅ Environment variable configuration
✅ Robust error handling and logging
✅ Comprehensive pytest testing
✅ Detailed docstrings (PEP 257)
✅ Dependency management with uv
✅ Code consistency with Ruff
✅ CI/CD with GitHub Actions

**Testing Requirements:**
- ONLY use pytest (not unittest)
- All tests need typing annotations
- All tests need docstrings
- Import TYPE_CHECKING fixtures

---

### 5. **TypeScript Node.js + React + UI**
**Path:** `rules/typescript-nodejs-nextjs-react-ui-css-cursorrules-/`

**Key Learnings:**
✅ Functional and declarative programming
✅ Descriptive variable names (isLoading, hasError)
✅ Lowercase-dashes for directories
✅ Interfaces over types
✅ Avoid enums; use maps
✅ Responsive design with mobile-first
✅ Optimize images (WebP, lazy loading)
✅ Minimize useClient and useEffect
✅ Optimize Web Vitals (LCP, CLS, FID)

---

### 6. **React Native Expo Router + TypeScript**
**Path:** `rules/react-native-expo-router-typescript-windows-cursorrules-prompt-file/`

**Key Learnings:**
✅ Use Expo Router for navigation
✅ NativeWind for Tailwind styling
✅ Version compatibility management
✅ Proper Babel configuration
✅ PowerShell for Windows development
✅ Check packages before installing
✅ Use official Expo libraries

**Package Compatibility:**
- NativeWind 2.0.11 + Tailwind CSS 3.3.2
- Avoid higher versions (process errors)
- Babel: include 'nativewind/babel' plugin

---

### 7. **Git Conventional Commits**
**Path:** `rules/git-conventional-commit-messages/`

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature (MINOR)
- `fix`: Bug fix (PATCH)
- `docs`, `style`, `refactor`, `perf`, `test`, `chore`, `ci`, `build`
- `BREAKING CHANGE`: Breaking API change (MAJOR)

**Examples:**
```
feat(auth): implement biometric authentication
fix(inventory): resolve quantity calculation error
docs: update API integration guide
```

---

### 8. **DRY & SOLID Principles**
**Path:** `rules/optimize-dry-solid-principles-cursorrules-prompt-f/`

**Key Concepts:**
- **DRY**: Don't Repeat Yourself
- **SOLID**:
  - Single Responsibility
  - Open/Closed
  - Liskov Substitution
  - Interface Segregation
  - Dependency Inversion

---

## 🔧 Additional Relevant Categories

### Testing
- ✅ Playwright E2E Testing
- ✅ Playwright API Testing
- ✅ Playwright Accessibility Testing
- ✅ Cypress E2E/API/Integration Testing
- ✅ Jest Unit Testing
- ✅ Vitest Unit Testing

### Mobile Development
- ✅ React Native Expo (multiple variants)
- ✅ Flutter Development
- ✅ SwiftUI Guidelines
- ✅ Android Jetpack Compose
- ✅ NativeScript

### Backend Frameworks
- ✅ Python FastAPI (multiple)
- ✅ Python Django
- ✅ Python Flask
- ✅ Node.js + Express
- ✅ Go Backend
- ✅ Elixir Phoenix

### Frontend Frameworks
- ✅ Next.js (15+ variants)
- ✅ React (10+ variants)
- ✅ Vue 3 + Nuxt 3
- ✅ Svelte/SvelteKit
- ✅ Solid.js
- ✅ Qwik

### Styling
- ✅ Tailwind CSS
- ✅ Shadcn UI
- ✅ Chakra UI
- ✅ Styled Components
- ✅ Material UI

### State Management
- ✅ Redux + TypeScript
- ✅ MobX
- ✅ React Query
- ✅ Zustand

### Database & API
- ✅ GraphQL Apollo Client
- ✅ MongoDB
- ✅ Prisma
- ✅ Supabase
- ✅ TypeScript Axios

---

## 💡 Key Patterns Applied to STOCK_VERIFY_2

### 1. **Project Structure**
Adopted clear separation:
```
backend/          # Python/Frappe
  api/
  services/
  models/
  schemas/
  utils/
  middleware/
  tests/

frontend/         # React Native
  app/           # Expo Router
  src/
    components/
    hooks/
    utils/
    types/
    services/
  assets/
```

### 2. **Naming Conventions**
- **Python**: `lowercase_with_underscores`
- **TypeScript**: `camelCase` for variables, `PascalCase` for components
- **Files**: `kebab-case.tsx` or `snake_case.py`
- **Constants**: `UPPER_SNAKE_CASE`

### 3. **Type Safety**
- TypeScript strict mode
- Python type hints everywhere
- Pydantic for validation
- Proper interfaces/types

### 4. **Testing Strategy**
- pytest for Python (no unittest)
- Jest for React Native
- Detox/Playwright for E2E
- >80% code coverage goal

### 5. **Error Handling**
- HTTPException for API errors
- React error boundaries
- Proper logging with context
- User-friendly error messages

### 6. **Performance**
- React.memo for components
- Async/await for I/O
- Code splitting and lazy loading
- Image optimization
- Caching strategies

### 7. **Security**
- Expo SecureStore for tokens
- No hardcoded secrets
- Input validation
- Parameterized queries
- Peer review for financial code

---

## 🚀 Implementation Checklist

### Immediate Actions
- [x] Clone awesome-cursorrules repository
- [x] Review relevant rule templates
- [x] Create enhanced `.cursorrules` file
- [ ] Apply naming conventions across codebase
- [ ] Add type hints to Python functions
- [ ] Add TypeScript interfaces to components
- [ ] Implement error boundaries
- [ ] Set up pytest properly

### Short-term Goals
- [ ] Refactor with DRY principles
- [ ] Add comprehensive docstrings
- [ ] Implement proper logging
- [ ] Add integration tests
- [ ] Optimize performance bottlenecks
- [ ] Document API endpoints

### Long-term Goals
- [ ] Achieve >80% test coverage
- [ ] Implement CI/CD pipeline
- [ ] Add comprehensive E2E tests
- [ ] Optimize bundle sizes
- [ ] Implement monitoring/observability

---

## 📖 Resources

### Cloned Repositories
1. **mcp-servers-repo/** - 70+ MCP servers
2. **awesome-cursorrules-repo/** - 170+ cursor rules

### Key Files Created
1. `.cursorrules` - Enhanced project-specific rules
2. `MCP_USAGE_GUIDE.md` - MCP server documentation (attempted)
3. `AWESOME_CURSORRULES_EXPLORATION.md` - This document

### External Links
- [Awesome Cursor Rules](https://github.com/PatrickJS/awesome-cursorrules)
- [Cursor MCP Servers](https://github.com/cursor/mcp-servers)
- [Expo Documentation](https://docs.expo.dev)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [Conventional Commits](https://www.conventionalcommits.org)

---

## 🎓 Key Takeaways

### For React Native Development
1. Use Expo Router for navigation (not React Navigation directly)
2. NativeWind for Tailwind-style styling
3. TypeScript strict mode for type safety
4. Expo SecureStore for sensitive data
5. Implement proper offline support
6. Use OTA updates for quick deploys

### For Python Backend
1. Use async/await for all I/O operations
2. Pydantic models for validation
3. Type hints on all functions
4. pytest for testing (not unittest)
5. Proper docstrings (PEP 257)
6. HTTPException for API errors

### For TypeScript
1. Interfaces over types
2. Avoid enums; use const objects
3. Strict mode enabled
4. Proper error boundaries
5. Code splitting with React.lazy
6. Performance optimization with memo/useMemo

### For Code Quality
1. Follow DRY and SOLID principles
2. Single Responsibility per function
3. Extract reusable logic
4. Keep components < 200 lines
5. Comprehensive testing
6. Proper error handling

### For Git
1. Conventional Commits format
2. Tag AI commits with [auto-ai]
3. Clear, descriptive messages
4. Reference issue numbers
5. Use proper commit types

---

## 🏆 Success Metrics

### Code Quality
- Consistent naming conventions
- Type safety (TypeScript + Python hints)
- Proper error handling
- Comprehensive docstrings

### Testing
- >80% code coverage
- Unit + Integration + E2E tests
- All critical paths tested
- Error cases covered

### Performance
- Fast load times
- Optimized bundle sizes
- Efficient database queries
- Proper caching

### Maintainability
- Clear project structure
- Good documentation
- Reusable components
- Low technical debt

---

**Created:** 2025-11-28
**Project:** STOCK_VERIFY_2-db-maped
**Status:** Active Development
**Next Review:** As needed for updates
