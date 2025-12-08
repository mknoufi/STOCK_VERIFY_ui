#!/bin/bash

echo "🔧 FIXING DEPENDENCY VERSION CONFLICTS & CODE ISSUES"
echo "=================================================="

cd frontend || exit 1

echo "📦 Fixing Frontend Dependency Conflicts..."

# Fix version mismatches in package.json
npm install --save-dev @types/react@~19.0.0
npm install --save react-native-gesture-handler@~2.22.1
npm install --save react-native-mmkv@^3.2.0
npm install --save react-native-safe-area-context@~5.2.0
npm install --save react-native-screens@~4.9.2
npm install --save react-native-svg@15.11.2
npm install --save react-native-webview@13.13.2
npm install --save-dev react-test-renderer@19.0.0
npm install --save-dev typescript@~5.7.2

echo "🔄 Fixing Import Redirects..."

# Fix import paths from old structure to new src/ structure
find app -name "*.tsx" -exec sed -i '' 's|../../services/|../../src/services/|g' {} \;
find app -name "*.tsx" -exec sed -i '' 's|../../components/|../../src/components/|g' {} \;
find app -name "*.tsx" -exec sed -i '' 's|../../constants/|../../src/constants/|g' {} \;
find app -name "*.tsx" -exec sed -i '' 's|../../hooks/|../../src/hooks/|g' {} \;
find app -name "*.tsx" -exec sed -i '' 's|../../utils/|../../src/utils/|g' {} \;
find app -name "*.tsx" -exec sed -i '' 's|../../types/|../../src/types/|g' {} \;

echo "🧹 Removing Excessive Console Logs..."

# Replace console.log with conditional logging in production
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.log(/__DEV__ \&\& console.log(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.warn(/__DEV__ \&\& console.warn(/g'
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' 's/console\.error(/__DEV__ \&\& console.error(/g'

echo "📦 Updating Backend Dependencies..."

cd ../backend || exit 1

# Update critical backend packages
pip install --upgrade fastapi uvicorn pydantic motor

echo "✅ DEPENDENCY FIXES COMPLETED"
echo "============================="
echo "Next steps:"
echo "1. Run: npm run typecheck"
echo "2. Run: npm run test"
echo "3. Run: npm run build:web"
