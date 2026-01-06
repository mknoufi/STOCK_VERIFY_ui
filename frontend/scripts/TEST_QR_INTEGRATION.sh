#!/bin/bash
set -e

echo "🧪 Starting QR Scan Integration Tests..."

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Run linting
echo "🔍 Running linting..."
npm run lint || exit 1

# Run type checking
echo "📋 Running type checking..."
npm run type-check || exit 1

# Run unit tests
echo "🔬 Running unit tests..."
npm run test:unit || exit 1

# Run integration tests
echo "🔗 Running integration tests..."
npm run test:integration || exit 1

# Run E2E tests (if available)
if [ -f "package.json" ] && grep -q "test:e2e" package.json; then
    echo "🎭 Running E2E tests..."
    npm run test:e2e || exit 1
fi

# Check test coverage
echo "📊 Generating test coverage..."
npm run test:coverage || exit 1

# Validate QR scanning functionality
echo "📷 Testing QR scanning functionality..."
node -e "
const qr = require('./src/utils/qrScanner');
const testBarcodes = ['1234567890123', '9876543210987'];
console.log('✅ QR scanner initialized');
testBarcodes.forEach(barcode => {
  if (qr.validate(barcode)) {
    console.log(\`✅ Barcode \${barcode} is valid\`);
  } else {
    console.error(\`❌ Barcode \${barcode} is invalid\`);
    process.exit(1);
  }
});
" || exit 1

echo "🎉 All tests passed successfully!"
