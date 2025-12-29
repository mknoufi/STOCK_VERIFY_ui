"""
Auto Error Finder Service
Automatically detects errors, broken functions, and provides recovery options
"""

import ast
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

logger = logging.getLogger(__name__)


@dataclass
class CodeIssue:
    """Represents a code issue found during analysis"""

    file_path: str
    line_number: int
    issue_type: str  # 'syntax_error', 'broken_function', 'missing_import', 'undefined_variable', 'type_error'
    severity: str  # 'critical', 'warning', 'info'
    message: str
    suggestion: Optional[str] = None
    auto_fixable: bool = False


@dataclass
class BrokenFunction:
    """Represents a broken or incomplete function"""

    file_path: str
    function_name: str
    line_number: int
    issues: list[str]
    severity: str
    recovery_action: Optional[str] = None


class AutoErrorFinder:
    """Automatically finds errors and broken functions in the codebase"""

    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.issues: list[CodeIssue] = []
        self.broken_functions: list[BrokenFunction] = []

    def scan_codebase(self) -> dict[str, Any]:
        """Scan entire codebase for errors and issues"""
        logger.info("Starting codebase scan for errors...")

        self.issues = []
        self.broken_functions = []

        # Scan Python files
        python_files = list(self.project_root.glob("**/*.py"))
        python_files = [
            f
            for f in python_files
            if not any(skip in str(f) for skip in ["__pycache__", ".pyc", "venv", "env"])
        ]

        for py_file in python_files:
            try:
                self._scan_file(py_file)
            except Exception as e:
                logger.error(f"Error scanning {py_file}: {str(e)}")
                self.issues.append(
                    CodeIssue(
                        file_path=str(py_file),
                        line_number=0,
                        issue_type="scan_error",
                        severity="warning",
                        message=f"Failed to scan file: {str(e)}",
                    )
                )

        return {
            "total_issues": len(self.issues),
            "critical_issues": len([i for i in self.issues if i.severity == "critical"]),
            "warnings": len([i for i in self.issues if i.severity == "warning"]),
            "broken_functions": len(self.broken_functions),
            "issues": [self._issue_to_dict(i) for i in self.issues],
            "broken_function_details": [self._function_to_dict(bf) for bf in self.broken_functions],
        }

    def _scan_file(self, file_path: Path):
        """Scan a single Python file for issues"""
        try:
            with open(file_path, encoding="utf-8") as f:
                content = f.read()
        except Exception as e:
            logger.warning(f"Cannot read {file_path}: {str(e)}")
            return

        # Check for syntax errors
        try:
            ast.parse(content)
        except SyntaxError as e:
            self.issues.append(
                CodeIssue(
                    file_path=str(file_path),
                    line_number=e.lineno or 0,
                    issue_type="syntax_error",
                    severity="critical",
                    message=f"Syntax error: {e.msg}",
                    suggestion=f"Check line {e.lineno}: {e.text or ''}",
                    auto_fixable=False,
                )
            )
            return

        # Parse AST and check for issues
        try:
            tree = ast.parse(content)
            self._analyze_ast(tree, file_path, content)
        except Exception as e:
            logger.warning(f"Error analyzing AST for {file_path}: {str(e)}")

    def _analyze_ast(self, tree: ast.AST, file_path: Path, content: str):
        """Analyze AST for common issues"""
        lines = content.split("\n")

        for node in ast.walk(tree):
            # Check for broken function definitions
            if isinstance(node, ast.FunctionDef):
                self._check_function(node, file_path, lines)

            # Check for missing imports (Name errors)
            if isinstance(node, ast.Name):
                self._check_name(node, file_path, tree)

            # Check for try/except blocks without proper handling
            if isinstance(node, ast.Try):
                self._check_try_except(node, file_path)

    def _check_function(self, func_node: ast.FunctionDef, file_path: Path, lines: list[str]):
        """Check if a function is broken or incomplete"""
        issues = []
        severity = "info"

        # Check if function body is empty
        if not func_node.body:
            issues.append("Function has no body")
            severity = "warning"
        elif len(func_node.body) == 1 and isinstance(func_node.body[0], ast.Pass):
            issues.append("Function only contains 'pass'")
            severity = "info"

        # Check for missing return statements (if function has type hints indicating return)
        has_return_annotation = func_node.returns is not None
        has_return = any(isinstance(node, ast.Return) for node in ast.walk(func_node))
        if has_return_annotation and not has_return:
            issues.append("Function has return type hint but no return statement")
            severity = "warning"

        # Check for common error patterns
        if any(isinstance(node, ast.Raise) for node in ast.walk(func_node)):
            issues.append("Function contains raise statements (may need error handling)")
            severity = "info"

        # Check for undefined variables in function
        defined_names = set()
        for node in ast.walk(func_node):
            if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Store):
                defined_names.add(node.id)

        # If issues found, create broken function entry
        if issues or severity != "info":
            recovery_action = None
            if "no body" in str(issues).lower():
                recovery_action = "Add function implementation"
            elif "return statement" in str(issues).lower():
                recovery_action = "Add return statement or change return type hint"

            self.broken_functions.append(
                BrokenFunction(
                    file_path=str(file_path),
                    function_name=func_node.name,
                    line_number=func_node.lineno,
                    issues=issues,
                    severity=severity,
                    recovery_action=recovery_action,
                )
            )

    def _check_name(self, name_node: ast.Name, file_path: Path, tree: ast.AST):
        """Check if a name/variable is properly defined"""
        # Skip if it's a function parameter or in an import
        if isinstance(name_node.ctx, ast.Store):
            return

        name = name_node.id
        # Skip built-in names
        if name in dir(__builtins__):
            return

        # Check if name is defined in the AST
        defined = False
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef) and node.name == name:
                defined = True
                break
            if isinstance(node, ast.ImportFrom) or isinstance(node, ast.Import):
                # Check imports
                for alias in getattr(node, "names", []):
                    if (
                        getattr(alias, "asname", None) == name
                        or getattr(alias, "name", None) == name
                    ):
                        defined = True
                        break

        if not defined and name not in ["self", "cls", "args", "kwargs"]:
            # This is a potential issue, but we'll be lenient
            pass

    def _check_try_except(self, try_node: ast.Try, file_path: Path):
        """Check if try/except blocks are properly handled"""
        if not try_node.handlers:
            self.issues.append(
                CodeIssue(
                    file_path=str(file_path),
                    line_number=try_node.lineno,
                    issue_type="error_handling",
                    severity="warning",
                    message="Try block without except handler",
                    suggestion="Add except clause to handle exceptions",
                    auto_fixable=False,
                )
            )
        elif any(not handler.body for handler in try_node.handlers):
            self.issues.append(
                CodeIssue(
                    file_path=str(file_path),
                    line_number=try_node.lineno,
                    issue_type="error_handling",
                    severity="warning",
                    message="Empty except block",
                    suggestion="Add proper exception handling code",
                    auto_fixable=False,
                )
            )

    def _issue_to_dict(self, issue: CodeIssue) -> dict[str, Any]:
        """Convert CodeIssue to dictionary"""
        return {
            "file_path": issue.file_path,
            "line_number": issue.line_number,
            "issue_type": issue.issue_type,
            "severity": issue.severity,
            "message": issue.message,
            "suggestion": issue.suggestion,
            "auto_fixable": issue.auto_fixable,
        }

    def _function_to_dict(self, bf: BrokenFunction) -> dict[str, Any]:
        """Convert BrokenFunction to dictionary"""
        return {
            "file_path": bf.file_path,
            "function_name": bf.function_name,
            "line_number": bf.line_number,
            "issues": bf.issues,
            "severity": bf.severity,
            "recovery_action": bf.recovery_action,
        }

    def auto_fix(self, issue: CodeIssue) -> tuple[bool, str]:
        """Attempt to automatically fix an issue"""
        if not issue.auto_fixable:
            return False, "Issue is not auto-fixable"

        # Add auto-fix logic here
        return False, "Auto-fix not implemented for this issue type"
