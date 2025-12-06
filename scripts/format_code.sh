#!/bin/bash
# Format code using Black, isort, and Prettier

set -e

echo "🔧 Formatting code..."

# Format Python code
echo "📝 Formatting Python code..."
if command -v black &> /dev/null; then
    black backend/ --line-length 100
    echo "✅ Black formatting complete"
else
    echo "⚠️  Black not installed. Install with: pip install black"
fi

if command -v isort &> /dev/null; then
    isort backend/ --profile black
    echo "✅ isort formatting complete"
else
    echo "⚠️  isort not installed. Install with: pip install isort"
fi

# Format TypeScript/JavaScript code
echo "📝 Formatting TypeScript/JavaScript code..."
if command -v npx &> /dev/null; then
    cd backfron
    npx prettier --write "**/*.{ts,tsx,js,jsx,json}" --ignore-path .gitignore
    echo "✅ Prettier formatting complete"
    cd ..
else
    echo "⚠️  npx not available. Install Node.js and npm"
fi

echo "✅ Code formatting complete!"
