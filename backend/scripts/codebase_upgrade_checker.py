"""
Codebase Upgrade Checker
Systematically scans and reports code quality issues
"""

import ast
import logging
from pathlib import Path
from typing import List, Dict, Any
from dataclasses import dataclass
from collections import defaultdict

logger = logging.getLogger(__name__)


@dataclass
class CodeIssue:
    """Represents a code quality issue"""
    file_path: str
    line_number: int
    issue_type: str
    severity: str
    message: str
    suggestion: str


class CodebaseUpgradeChecker:
    """Checks codebase for upgrade opportunities"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.issues: List[CodeIssue] = []
        self.stats: Dict[str, int] = defaultdict(int)

    def scan_codebase(self) -> Dict[str, Any]:
        """Scan entire codebase for issues"""
        logger.info("Starting codebase upgrade scan...")

        python_files = list(self.project_root.glob("**/*.py"))
        python_files = [
            f for f in python_files
            if not any(skip in str(f) for skip in ["__pycache__", ".pyc", "venv", "env", "tests"])
        ]

        for py_file in python_files:
            try:
                self._scan_file(py_file)
            except Exception as e:
                logger.warning(f"Error scanning {py_file}: {str(e)}")

        return {
            "total_files": len(python_files),
            "total_issues": len(self.issues),
            "issues_by_type": self._group_issues_by_type(),
            "issues_by_severity": self._group_issues_by_severity(),
            "issues": [self._issue_to_dict(i) for i in self.issues],
        }

    def _scan_file(self, file_path: Path):
        """Scan a single Python file"""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            logger.warning(f"Cannot read {file_path}: {str(e)}")
            return

        # Check syntax
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            self.issues.append(CodeIssue(
                file_path=str(file_path),
                line_number=e.lineno or 0,
                issue_type="syntax_error",
                severity="critical",
                message=f"Syntax error: {e.msg}",
                suggestion=f"Fix syntax error at line {e.lineno}"
            ))
            return

        # Analyze AST
        self._analyze_ast(tree, file_path, content)

    def _analyze_ast(self, tree: ast.AST, file_path: Path, content: str):
        """Analyze AST for code quality issues"""
        lines = content.split("\n")

        for node in ast.walk(tree):
            # Check for generic Exception handlers
            if isinstance(node, ast.Try):
                self._check_exception_handling(node, file_path, lines)

            # Check for missing type hints
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                self._check_type_hints(node, file_path, lines)

            # Check for bare except clauses
            if isinstance(node, ast.ExceptHandler):
                self._check_bare_except(node, file_path, lines)

    def _check_exception_handling(self, node: ast.Try, file_path: Path, lines: List[str]):
        """Check exception handling patterns"""
        for handler in node.handlers:
            if handler.type is None:
                self.issues.append(CodeIssue(
                    file_path=str(file_path),
                    line_number=handler.lineno,
                    issue_type="bare_except",
                    severity="warning",
                    message="Bare except clause found",
                    suggestion="Use specific exception types or 'except Exception as e:'"
                ))
            elif isinstance(handler.type, ast.Name) and handler.type.id == "Exception":
                # Check if it's a generic Exception handler
                self.issues.append(CodeIssue(
                    file_path=str(file_path),
                    line_number=handler.lineno,
                    issue_type="generic_exception",
                    severity="info",
                    message="Generic Exception handler found",
                    suggestion="Consider using specific exception types from backend.exceptions"
                ))

    def _check_type_hints(self, node: ast.FunctionDef, file_path: Path, lines: List[str]):
        """Check for missing type hints"""
        # Skip private methods and test files
        if node.name.startswith("_") or "test" in str(file_path):
            return

        # Check return type
        if node.returns is None and node.name != "__init__":
            # Check if function has return statements
            has_return = any(isinstance(n, ast.Return) for n in ast.walk(node))
            if has_return:
                self.issues.append(CodeIssue(
                    file_path=str(file_path),
                    line_number=node.lineno,
                    issue_type="missing_return_type",
                    severity="info",
                    message=f"Function '{node.name}' missing return type hint",
                    suggestion="Add return type annotation"
                ))

        # Check arguments
        for arg in node.args.args:
            if arg.annotation is None and arg.arg != "self" and arg.arg != "cls":
                self.issues.append(CodeIssue(
                    file_path=str(file_path),
                    line_number=node.lineno,
                    issue_type="missing_arg_type",
                    severity="info",
                    message=f"Argument '{arg.arg}' missing type hint",
                    suggestion="Add type annotation for argument"
                ))

    def _check_bare_except(self, node: ast.ExceptHandler, file_path: Path, lines: List[str]):
        """Check for bare except clauses"""
        if node.type is None:
            self.issues.append(CodeIssue(
                file_path=str(file_path),
                line_number=node.lineno,
                issue_type="bare_except",
                severity="warning",
                message="Bare except clause",
                suggestion="Use 'except Exception as e:' or specific exception type"
            ))

    def _group_issues_by_type(self) -> Dict[str, int]:
        """Group issues by type"""
        grouped = defaultdict(int)
        for issue in self.issues:
            grouped[issue.issue_type] += 1
        return dict(grouped)

    def _group_issues_by_severity(self) -> Dict[str, int]:
        """Group issues by severity"""
        grouped = defaultdict(int)
        for issue in self.issues:
            grouped[issue.severity] += 1
        return dict(grouped)

    def _issue_to_dict(self, issue: CodeIssue) -> Dict[str, Any]:
        """Convert issue to dictionary"""
        return {
            "file": issue.file_path,
            "line": issue.line_number,
            "type": issue.issue_type,
            "severity": issue.severity,
            "message": issue.message,
            "suggestion": issue.suggestion,
        }


if __name__ == "__main__":
    import json

    project_root = Path(__file__).parent.parent.parent
    checker = CodebaseUpgradeChecker(project_root)
    results = checker.scan_codebase()

    print(json.dumps(results, indent=2))

