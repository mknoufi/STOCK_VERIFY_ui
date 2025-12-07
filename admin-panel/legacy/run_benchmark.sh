#!/bin/bash

# Comprehensive Codebase Benchmark Suite
# Runs both client-side and server-side benchmarks

echo "🚀 COMPREHENSIVE CODEBASE BENCHMARK SUITE"
echo "=========================================="
echo ""

# Check if Python is available
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python3 to run server benchmarks."
    exit 1
fi

# Check if required Python packages are available
python3 -c "import psutil, json, ast" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "⚠️  Installing required Python packages..."
    pip3 install psutil 2>/dev/null || pip install psutil 2>/dev/null
fi

echo "📊 Running Server-Side Benchmark..."
echo "-----------------------------------"
python3 benchmark_server.py

echo ""
echo "🌐 Client-Side Benchmark Instructions:"
echo "-------------------------------------"
echo "1. Open your admin panel in a web browser"
echo "2. Look for the 'Codebase Benchmark' panel in the top-right corner"
echo "3. Click 'Run Benchmark' to execute client-side tests"
echo "4. Use 'Export Results' to save the results"
echo ""

echo "📋 Benchmark Components:"
echo "----------------------"
echo "✅ Server Performance (Python)"
echo "   • Startup Time Analysis"
echo "   • Memory Usage Patterns"
echo "   • File I/O Operations"
echo "   • Request Handling Simulation"
echo "   • Code Quality Metrics"
echo "   • System Resource Usage"
echo ""
echo "✅ Client Performance (JavaScript)"
echo "   • DOM Operation Speed"
echo "   • API Request Performance"
echo "   • Memory Management"
echo "   • Log Processing Speed"
echo "   • Browser Capabilities"
echo ""

echo "🎯 Performance Targets:"
echo "----------------------"
echo "• Startup Time: < 100ms"
echo "• Memory Overhead: < 50MB"
echo "• API Response: < 200ms"
echo "• DOM Operations: > 1000 ops/sec"
echo "• Maintainability Index: > 70"
echo ""

echo "📁 Generated Files:"
echo "-------------------"
echo "• server-benchmark-[timestamp].json - Server results"
echo "• codebase-benchmark-[timestamp].json - Client results (from browser)"
echo ""

echo "🏆 Scoring System:"
echo "-----------------"
echo "• 90-100: Excellent Performance"
echo "• 80-89:  Good Performance"
echo "• 70-79:  Acceptable Performance"
echo "• 60-69:  Needs Optimization"
echo "• < 60:   Poor Performance"
echo ""

# Check if benchmark files exist
if [ -f "benchmark.js" ] && [ -f "benchmark_server.py" ]; then
    echo "✅ All benchmark files are ready!"
else
    echo "❌ Some benchmark files are missing. Please ensure all files are present."
fi

echo ""
echo "🔧 Benchmark Complete! Review the results above and in the generated JSON files."
