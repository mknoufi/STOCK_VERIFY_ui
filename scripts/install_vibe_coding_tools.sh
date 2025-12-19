#!/bin/bash
# install_vibe_coding_tools.sh
# Installs AI-assisted coding tools for the Stock Verification System

set -e

echo "🎵 Installing Vibe Coding Tools..."
echo "=================================="

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is required but not installed."
    exit 1
fi

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    exit 1
fi

# Check for pip
if ! command -v pip3 &> /dev/null; then
    echo "❌ pip3 is required but not installed."
    exit 1
fi

echo ""
echo "📦 Installing Python-based tools..."
echo "------------------------------------"

# Aider - Terminal-based AI pair programming
echo "Installing Aider..."
pip3 install --upgrade aider-chat

# Open Interpreter - Natural language computer use
echo "Installing Open Interpreter..."
pip3 install --upgrade open-interpreter

echo ""
echo "📦 Installing Node.js-based MCP servers..."
echo "-------------------------------------------"

# These will be installed on-demand via npx, but we can pre-cache them
echo "Pre-caching MCP servers..."
npx -y @testsprite/testsprite-mcp@latest --help 2>/dev/null || true
npx -y @upstash/context7-mcp@latest --help 2>/dev/null || true

echo ""
echo "📦 VS Code Extensions (install manually)..."
echo "--------------------------------------------"
echo "Run these commands to install VS Code extensions:"
echo ""
echo "  code --install-extension Continue.continue"
echo "  code --install-extension saoudrizwan.claude-dev"
echo "  code --install-extension github.copilot"
echo "  code --install-extension github.copilot-chat"
echo ""

echo ""
echo "🔑 API Keys Required"
echo "--------------------"
echo "Add these to your shell profile (~/.zshrc or ~/.bashrc):"
echo ""
echo "  export ANTHROPIC_API_KEY=your_claude_key"
echo "  export OPENAI_API_KEY=your_openai_key"
echo ""

echo ""
echo "✅ Installation Complete!"
echo "========================="
echo ""
echo "Available tools:"
echo "  • aider          - Terminal AI pair programming"
echo "  • interpreter    - Natural language shell"
echo "  • Continue       - VS Code extension"
echo "  • Cline          - VS Code extension"
echo "  • Copilot        - VS Code extension"
echo ""
echo "Configuration files created:"
echo "  • .aider.conf.yml"
echo "  • .aiderignore"
echo "  • .continue/config.json"
echo "  • .clinerules"
echo "  • .swe-agent.yml"
echo "  • .metagpt.yml"
echo "  • .autogpt.yml"
echo "  • .devon.yml"
echo "  • .interpreter.yml"
echo "  • .aicontext.json"
echo ""
echo "Read VIBE_CODING_SETUP.md for usage instructions."
echo ""
echo "🎵 Happy vibe coding!"
