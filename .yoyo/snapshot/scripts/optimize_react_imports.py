#!/usr/bin/env python3
"""
React Import Cleanup Utility
Removes redundant React imports and optimizes import statements
"""

import re
import argparse
from pathlib import Path
from typing import Set, Tuple


class ReactImportOptimizer:
    """Optimizes React import statements in TypeScript/JavaScript files"""

    def __init__(self):
        self.processed_files = 0
        self.optimized_files = 0

        # Common patterns
        self.react_import_pattern = re.compile(
            r'^import\s+React(?:\s*,\s*\{[^}]*\})?\s+from\s+[\'"]react[\'"];?\s*$', re.MULTILINE
        )

        self.hooks_import_pattern = re.compile(
            r'^import\s+\{([^}]+)\}\s+from\s+[\'"]react[\'"];?\s*$', re.MULTILINE
        )

        self.combined_import_pattern = re.compile(
            r'^import\s+React\s*,\s*\{([^}]+)\}\s+from\s+[\'"]react[\'"];?\s*$', re.MULTILINE
        )

        # Hook usage patterns
        self.hook_usage_patterns = {
            "useState": re.compile(r"\buseState\b"),
            "useEffect": re.compile(r"\buseEffect\b"),
            "useContext": re.compile(r"\buseContext\b"),
            "useReducer": re.compile(r"\buseReducer\b"),
            "useCallback": re.compile(r"\buseCallback\b"),
            "useMemo": re.compile(r"\useMemo\b"),
            "useRef": re.compile(r"\buseRef\b"),
            "useLayoutEffect": re.compile(r"\buseLayoutEffect\b"),
            "useImperativeHandle": re.compile(r"\buseImperativeHandle\b"),
            "useDebugValue": re.compile(r"\buseDebugValue\b"),
        }

        # JSX usage pattern (React 17+ doesn't need React import for JSX)
        self.jsx_pattern = re.compile(r"<\w+|React\.")
        self.react_usage_pattern = re.compile(r"\bReact\.")

    def analyze_file(self, file_path: Path) -> Tuple[str, Set[str], bool, bool]:
        """
        Analyze a file to determine what React imports are needed

        Returns:
            (content, used_hooks, needs_react, has_jsx)
        """
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()

        # Find used hooks
        used_hooks = set()
        for hook_name, pattern in self.hook_usage_patterns.items():
            if pattern.search(content):
                used_hooks.add(hook_name)

        # Check if React namespace is used
        needs_react = bool(self.react_usage_pattern.search(content))

        # Check if JSX is present
        has_jsx = bool(self.jsx_pattern.search(content))

        return content, used_hooks, needs_react, has_jsx

    def optimize_imports(
        self, content: str, used_hooks: Set[str], needs_react: bool, has_jsx: bool
    ) -> str:
        """Optimize React imports based on usage analysis"""

        # Remove all existing React imports
        content = self.react_import_pattern.sub("", content)
        content = self.hooks_import_pattern.sub("", content)
        content = self.combined_import_pattern.sub("", content)

        # Build new import statement
        import_parts = []

        # Add React if needed (for React.* usage or pre-React 17)
        if needs_react:
            import_parts.append("React")

        # Add hooks if any are used
        if used_hooks:
            hooks_list = ", ".join(sorted(used_hooks))
            if needs_react:
                import_parts = ["React", f"{{ {hooks_list} }}"]
            else:
                import_parts = [f"{{ {hooks_list} }}"]

        # Generate import statement if needed
        if import_parts:
            if len(import_parts) == 1:
                new_import = f"import {import_parts[0]} from 'react';"
            else:
                new_import = f"import {', '.join(import_parts)} from 'react';"
        else:
            new_import = ""

        # Insert new import at the top (after any 'use client' or similar directives)
        lines = content.split("\n")
        insert_index = 0

        # Skip directives and find first import or actual code
        for i, line in enumerate(lines):
            stripped = line.strip()
            if stripped.startswith("'use") or stripped.startswith('"use'):
                insert_index = i + 1
            elif stripped and not stripped.startswith("//") and not stripped.startswith("/*"):
                break

        # Insert the new import
        if new_import:
            lines.insert(insert_index, new_import)

        # Clean up extra blank lines
        optimized_content = "\n".join(lines)
        optimized_content = re.sub(r"\n\n\n+", "\n\n", optimized_content)

        return optimized_content

    def process_file(self, file_path: Path) -> bool:
        """
        Process a single file and optimize its React imports

        Returns:
            True if file was modified, False otherwise
        """
        self.processed_files += 1

        try:
            content, used_hooks, needs_react, has_jsx = self.analyze_file(file_path)

            # Skip files that don't use React
            if not used_hooks and not needs_react and not has_jsx:
                return False

            optimized_content = self.optimize_imports(content, used_hooks, needs_react, has_jsx)

            # Check if content actually changed
            if content.strip() != optimized_content.strip():
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(optimized_content)

                self.optimized_files += 1
                print(f"✅ Optimized: {file_path}")

                if used_hooks:
                    print(f"   Hooks: {', '.join(sorted(used_hooks))}")
                if needs_react:
                    print("   React namespace: used")

                return True

            return False

        except Exception as e:
            print(f"❌ Error processing {file_path}: {e}")
            return False

    def process_directory(self, directory: Path, recursive: bool = True) -> None:
        """Process all TypeScript/JavaScript files in a directory"""

        patterns = ["*.tsx", "*.jsx", "*.ts", "*.js"]

        for pattern in patterns:
            if recursive:
                files = directory.rglob(pattern)
            else:
                files = directory.glob(pattern)

            for file_path in files:
                # Skip node_modules and other irrelevant directories
                if any(part.startswith(".") or part == "node_modules" for part in file_path.parts):
                    continue

                self.process_file(file_path)

    def print_summary(self) -> None:
        """Print optimization summary"""
        print("\n📊 React Import Optimization Summary:")
        print(f"   Files processed: {self.processed_files}")
        print(f"   Files optimized: {self.optimized_files}")
        print(f"   Files unchanged: {self.processed_files - self.optimized_files}")


def main():
    parser = argparse.ArgumentParser(
        description="Optimize React imports in TypeScript/JavaScript files"
    )
    parser.add_argument("path", type=str, help="File or directory path to process")
    parser.add_argument(
        "--recursive",
        "-r",
        action="store_true",
        help="Process directories recursively (default: True)",
    )
    parser.add_argument(
        "--dry-run",
        "-d",
        action="store_true",
        help="Show what would be changed without modifying files",
    )

    args = parser.parse_args()

    path = Path(args.path)
    if not path.exists():
        print(f"❌ Path does not exist: {path}")
        return 1

    optimizer = ReactImportOptimizer()

    if args.dry_run:
        print("🔍 DRY RUN - No files will be modified")

    if path.is_file():
        if args.dry_run:
            content, used_hooks, needs_react, has_jsx = optimizer.analyze_file(path)
            print(f"📄 {path}")
            print(f"   Hooks used: {', '.join(sorted(used_hooks)) if used_hooks else 'None'}")
            print(f"   React namespace: {'Yes' if needs_react else 'No'}")
            print(f"   JSX present: {'Yes' if has_jsx else 'No'}")
        else:
            optimizer.process_file(path)
    else:
        if args.dry_run:
            print(f"Would process all React files in: {path}")
        else:
            optimizer.process_directory(path, recursive=args.recursive)

    if not args.dry_run:
        optimizer.print_summary()

    return 0


if __name__ == "__main__":
    exit(main())
