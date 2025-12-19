# VS Code Configuration Guide

This directory contains VS Code workspace configuration files to enhance development experience.

## Files Overview

### `settings.json`
Workspace settings for Python, TypeScript, ESLint, Prettier, and more.

**Key Features:**
- Python: Configured for Python 3.9+ with mypy type checking
- TypeScript: Uses workspace TypeScript version from `backfron/node_modules`
- Auto-formatting on save for Python, TypeScript, JavaScript, and JSON
- Ruff for Python linting and formatting
- ESLint + Prettier for TypeScript/JavaScript
- File exclusions for cleaner workspace

**Python Settings:**
- Interpreter: `/usr/bin/python3`
- Linter: mypy (enabled)
- Formatter: Ruff (replaces Black)
- Testing: pytest

**TypeScript Settings:**
- Formatter: Prettier
- Linter: ESLint
- Auto-import updates on file moves

### `launch.json`
Debug configurations for running and debugging the application.

**Available Configurations:**
1. **Python: FastAPI Backend** - Launch backend server with debugging
2. **Python: Current File** - Debug the currently open Python file
3. **Python: Pytest Current File** - Debug tests in the current file
4. **Python: Pytest All** - Debug all backend tests

**Usage:**
1. Open the Debug panel (Cmd+Shift+D or Ctrl+Shift+D)
2. Select a configuration from the dropdown
3. Press F5 or click "Start Debugging"

### `tasks.json`
Predefined tasks for common development operations.

**Available Tasks:**
- `Start Backend` - Run FastAPI server
- `Start Frontend` - Run Expo dev server
- `Run Backend Tests` - Execute pytest
- `Run Frontend Tests` - Execute Jest tests
- `Lint Python` - Check Python code with ruff
- `Format Python` - Format Python code
- `Lint TypeScript` - Check TypeScript with ESLint
- `Format TypeScript` - Format with Prettier
- `Run Full CI` - Execute complete CI pipeline
- `Docker: Build/Up/Down` - Docker operations

**Usage:**
- Press `Cmd+Shift+B` (Mac) or `Ctrl+Shift+B` (Windows/Linux) to run default build task
- Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux) and type "Tasks: Run Task"

### `extensions.json`
Recommended VS Code extensions for this project.

**Recommended Extensions:**
- **Python**: ms-python.python, charliermarsh.ruff
- **TypeScript/JavaScript**: dbaeumer.vscode-eslint, esbenp.prettier-vscode
- **React Native**: msjsdiag.vscode-react-native
- **Database**: mongodb.mongodb-vscode
- **Docker**: ms-azuretools.vscode-docker
- **Git**: eamodio.gitlens
- **General**: editorconfig.editorconfig, gruntfuggly.todo-tree

VS Code will prompt you to install these when you open the workspace.

### `python.code-snippets`
Code snippets for Python development.

**Available Snippets:**
- `fastapi-route` - FastAPI route handler template
- `pytest-test` - Basic pytest test function
- `pytest-async` - Async pytest test
- `mongo-query` - MongoDB query template
- `logger` - Logger statement

**Usage:** Start typing the prefix and press Tab.

### `typescript.code-snippets`
Code snippets for TypeScript/React Native development.

**Available Snippets:**
- `rnc` - React Native component
- `rnscreen` - React Native screen (Expo Router)
- `zustand` - Zustand store
- `api-call` - Axios API call
- `usequery` - React Query hook

**Usage:** Start typing the prefix and press Tab.

## Quick Start

1. **Install Recommended Extensions**
   - Open VS Code
   - Press `Cmd+Shift+P` and type "Extensions: Show Recommended Extensions"
   - Click "Install All Workspace Recommendations"

2. **Verify Python Interpreter**
   - Press `Cmd+Shift+P` and type "Python: Select Interpreter"
   - Ensure `/usr/bin/python3` is selected

3. **Start Development**
   - Press `Cmd+Shift+B` to run the default build task
   - Or use Tasks menu to start backend/frontend individually

4. **Debug**
   - Set breakpoints in your code
   - Press F5 to start debugging
   - Select appropriate configuration

## Keyboard Shortcuts

### General
- `Cmd+Shift+P` (Mac) / `Ctrl+Shift+P` (Win/Linux) - Command Palette
- `Cmd+P` (Mac) / `Ctrl+P` (Win/Linux) - Quick File Open
- `Cmd+Shift+F` (Mac) / `Ctrl+Shift+F` (Win/Linux) - Search in Files

### Editing
- `Shift+Alt+F` - Format Document
- `Cmd+.` (Mac) / `Ctrl+.` (Win/Linux) - Quick Fix
- `F2` - Rename Symbol

### Debugging
- `F5` - Start/Continue Debugging
- `Shift+F5` - Stop Debugging
- `F9` - Toggle Breakpoint
- `F10` - Step Over
- `F11` - Step Into
- `Shift+F11` - Step Out

### Testing
- `Cmd+Shift+B` (Mac) / `Ctrl+Shift+B` (Win/Linux) - Run Build Task

## Troubleshooting

### Python Linting Not Working
1. Check Python interpreter is correct
2. Ensure ruff is installed: `pip install ruff`
3. Reload VS Code window

### TypeScript Errors
1. Ensure you're in the `backfron` directory
2. Run `npm install` to install dependencies
3. Press `Cmd+Shift+P` and type "TypeScript: Restart TS Server"

### Format on Save Not Working
1. Check settings.json has `"editor.formatOnSave": true`
2. Ensure formatter extensions are installed
3. Check file-specific settings under `[python]`, `[typescript]`, etc.

### Tasks Not Running
1. Check terminal path settings
2. Ensure required commands (npm, python3, etc.) are in PATH
3. Try running commands manually in terminal first

## Customization

To customize these settings for your local machine without affecting the workspace:
1. Open User Settings: `Cmd+,` (Mac) / `Ctrl+,` (Win/Linux)
2. Add your personal overrides
3. User settings take precedence over workspace settings

## Additional Resources

- [VS Code Python Documentation](https://code.visualstudio.com/docs/python/python-tutorial)
- [VS Code TypeScript Documentation](https://code.visualstudio.com/docs/typescript/typescript-tutorial)
- [Debugging in VS Code](https://code.visualstudio.com/docs/editor/debugging)
- [Task Automation](https://code.visualstudio.com/docs/editor/tasks)
