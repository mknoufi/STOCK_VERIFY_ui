# TestSprite Configuration Guide

## Dynamic Port Detection ✅

The TestSprite configuration now **automatically detects** which port your frontend is running on!

## Quick Start

### 1. Start Your Frontend

**For Web Testing (Recommended for TestSprite):**
```bash
cd frontend
npm run web
```
This starts Expo web server on port **19006** (default).

**For Native Testing:**
```bash
cd frontend
npm start
```
This starts Metro bundler on port **8081**.

### 2. Auto-Configure TestSprite

```bash
# This automatically detects the port and configures TestSprite
./testsprite_tests/bootstrap-with-dynamic-port.sh
```

Or manually:
```bash
node testsprite_tests/dynamic-port-config.js
```

### 3. Run Tests

```bash
node /Users/noufi1/.npm/_npx/8ddf6bea01b2519d/node_modules/@testsprite/testsprite-mcp/dist/index.js generateCodeAndExecute
```

## Port Detection

The system checks ports in this order:
1. **19006** - Expo Web (default, preferred for TestSprite)
2. **19000-19002** - Expo Web (alternate ports)
3. **8081** - Metro Bundler (fallback, but TestSprite prefers web)

## Manual Port Override

If you need to manually set the port:

```bash
# Edit testsprite_tests/tmp/config.json
# Set "localPort" to your desired port
```

Or use environment variable:
```bash
export FRONTEND_PORT=19006
node testsprite_tests/dynamic-port-config.js
```

## Troubleshooting

### Port Not Detected

1. **Check if frontend is running:**
   ```bash
   lsof -i :19006  # Web port
   lsof -i :8081   # Metro port
   ```

2. **Start the correct server:**
   ```bash
   # For TestSprite (web testing)
   cd frontend && npm run web
   
   # For native testing
   cd frontend && npm start
   ```

### TestSprite Needs Web Port

TestSprite requires the **web server** (port 19006), not Metro (8081).

If you see Metro port detected, start web server:
```bash
cd frontend
npm run web
```

Then re-run the bootstrap script.

## Files

- `dynamic-port-config.js` - Auto-detects and configures port
- `bootstrap-with-dynamic-port.sh` - Bootstrap script with auto-detection
- `tmp/config.json` - TestSprite configuration (auto-generated)

## Integration

The port detection is integrated into:
- ✅ TestSprite configuration
- ✅ Frontend utilities (`frontend/utils/portDetection.ts`)
- ✅ Detection scripts (`scripts/detect-frontend-port.js`)

---

**Status:** ✅ Ready to use with dynamic port detection!
