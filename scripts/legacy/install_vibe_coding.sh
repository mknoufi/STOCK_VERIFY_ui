#!/bin/bash
# =============================================================================
# 🎵 Vibe Coding Tools Installation Script
# Stock Verification System
# =============================================================================

set -e

echo "🎵 ============================================="
echo "   Vibe Coding Tools Installation"
echo "   Stock Verification System"
echo "============================================="
echo ""

# Check for required environment variables
check_api_keys() {
    echo "📋 Checking API keys..."

    if [ -z "$ANTHROPIC_API_KEY" ]; then
        echo "⚠️  ANTHROPIC_API_KEY not set (required for Claude-based tools)"
        echo "   Run: export ANTHROPIC_API_KEY=your_key_here"
    else
        echo "✅ ANTHROPIC_API_KEY is set"
    fi

    if [ -z "$OPENAI_API_KEY" ]; then
        echo "⚠️  OPENAI_API_KEY not set (optional, for GPT models)"
    else
        echo "✅ OPENAI_API_KEY is set"
    fi
    echo ""
}

# Install Python-based tools
install_python_tools() {
    echo "📦 Installing Python-based AI coding tools..."
    echo ""

    # Aider
    echo "   Installing Aider (AI pair programming)..."
    pip install --upgrade aider-chat 2>/dev/null && echo "   ✅ Aider installed" || echo "   ⚠️  Aider failed - try: pip install aider-chat"

    # Open Interpreter
    echo "   Installing Open Interpreter..."
    pip install --upgrade open-interpreter 2>/dev/null && echo "   ✅ Open Interpreter installed" || echo "   ⚠️  Open Interpreter failed"

    echo ""
}

# List VS Code extensions to install
list_vscode_extensions() {
    echo "📦 VS Code Extensions to Install:"
    echo ""
    echo "   1. Continue (open-source AI assistant)"
    echo "      code --install-extension Continue.continue"
    echo ""
    echo "   2. Cline / Claude Dev (autonomous agent)"
    echo "      code --install-extension saoudrizwan.claude-dev"
    echo ""
    echo "   3. GitHub Copilot (if licensed)"
    echo "      code --install-extension GitHub.copilot"
    echo ""

    read -p "Install VS Code extensions now? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        code --install-extension Continue.continue 2>/dev/null || echo "   ⚠️  Continue failed"
        code --install-extension saoudrizwan.claude-dev 2>/dev/null || echo "   ⚠️  Cline failed"
        echo "   ✅ Extensions installation attempted"
    fi
    echo ""
}

# Show configuration status
show_config_status() {
    echo "📁 Configuration Files Status:"
    echo ""

    configs=(
        ".aider.conf.yml:Aider"
        ".continue/config.json:Continue"
        ".clinerules:Cline"
        ".cursorrules:Cursor"
        ".swe-agent.yml:SWE-Agent"
        ".interpreter.yml:Open Interpreter"
        ".metagpt.yml:MetaGPT"
        ".autogpt.yml:AutoGPT"
        ".devon.yml:Devon"
        ".github/copilot-instructions.md:GitHub Copilot"
    )

    for config in "${configs[@]}"; do
        file="${config%%:*}"
        name="${config##*:}"
        if [ -f "$file" ]; then
            echo "   ✅ $name ($file)"
        else
            echo "   ❌ $name ($file) - missing"
        fi
    done
    echo ""
}

# Show quick start guide
show_quickstart() {
    echo "🚀 Quick Start Guide:"
    echo ""
    echo "   Aider (terminal):"
    echo "   $ aider"
    echo ""
    echo "   Open Interpreter:"
    echo "   $ interpreter --config .interpreter.yml"
    echo ""
    echo "   Continue (VS Code):"
    echo "   - Open Command Palette (Cmd+Shift+P)"
    echo "   - Type 'Continue: Open Chat'"
    echo ""
    echo "   Cline (VS Code):"
    echo "   - Click Cline icon in sidebar"
    echo "   - Start chatting with the agent"
    echo ""
    echo "📖 Full documentation: VIBE_CODING_SETUP.md"
    echo ""
}

# Main installation flow
main() {
    check_api_keys
    install_python_tools
    list_vscode_extensions
    show_config_status
    show_quickstart

    echo "🎵 ============================================="
    echo "   Installation Complete!"
    echo "============================================="
    echo ""
    echo "Next steps:"
    echo "  1. Set ANTHROPIC_API_KEY if not already set"
    echo "  2. Run 'aider' to start AI pair programming"
    echo "  3. Read VIBE_CODING_SETUP.md for full guide"
    echo ""
}

main "$@"
