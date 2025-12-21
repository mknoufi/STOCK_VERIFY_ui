"""
Stock Verify AI Crew - Multi-Agent System for Development Assistance
=====================================================================
This CrewAI implementation provides specialized agents for:
- Code Review & Security Auditing
- Testing & Quality Assurance
- Documentation Generation
- Bug Analysis & Debugging

Usage:
    python -m agents.stock_verify_crew --task review --file backend/server.py
    python -m agents.stock_verify_crew --task test --file backend/api/items.py
    python -m agents.stock_verify_crew --task docs --file backend/db_mapping_config.py
"""

import os
import sys
from pathlib import Path

try:
    from crewai import Agent, Crew, Process, Task
    from crewai.tools import tool
except ImportError:
    print("Please install required packages: pip install -r agents/requirements.txt")
    sys.exit(1)

from dotenv import load_dotenv

load_dotenv()

# Project-specific context
PROJECT_CONTEXT = """
Stock Verify is a multi-database inventory management system with:
- Backend: FastAPI (Python 3.10+), MongoDB (primary), SQL Server (read-only ERP)
- Frontend: React Native + Expo (TypeScript), Zustand state management
- Auth: JWT with access/refresh tokens, required for /api/* routes
- Key files: backend/server.py, backend/config.py, backend/db_mapping_config.py
- Testing: pytest (backend), Jest (frontend)
- Security: All SQL queries must use parameterized queries (? placeholders)
- CORS: Non-wildcard configuration required
"""


# ============================================================================
# CUSTOM TOOLS
# ============================================================================


@tool("Read File")
def read_file_tool(file_path: str) -> str:
    """Read the contents of a file in the project"""
    try:
        base_path = Path(__file__).parent.parent
        full_path = base_path / file_path
        if full_path.exists():
            return full_path.read_text(encoding="utf-8")
        return f"File not found: {file_path}"
    except Exception as e:
        return f"Error reading file: {e}"


@tool("List Directory")
def list_dir_tool(dir_path: str) -> str:
    """List contents of a directory"""
    try:
        base_path = Path(__file__).parent.parent
        full_path = base_path / dir_path
        if full_path.exists() and full_path.is_dir():
            items = list(full_path.iterdir())
            return "\n".join([f"{'📁' if i.is_dir() else '📄'} {i.name}" for i in items])
        return f"Directory not found: {dir_path}"
    except Exception as e:
        return f"Error listing directory: {e}"


@tool("Search Code Pattern")
def search_code_tool(pattern: str, file_extension: str = ".py") -> str:
    """Search for a pattern in code files"""
    try:
        import subprocess

        base_path = Path(__file__).parent.parent
        result = subprocess.run(
            ["grep", "-rn", "--include", f"*{file_extension}", pattern, str(base_path)],
            capture_output=True,
            text=True,
            timeout=30,
        )
        return result.stdout[:5000] if result.stdout else f"No matches found for: {pattern}"
    except Exception as e:
        return f"Error searching: {e}"


@tool("Run Tests")
def run_tests_tool(test_path: str = "backend/tests/") -> str:
    """Run pytest on specified path"""
    try:
        import subprocess

        base_path = Path(__file__).parent.parent
        result = subprocess.run(
            ["python", "-m", "pytest", test_path, "-v", "--tb=short"],
            capture_output=True,
            text=True,
            cwd=str(base_path),
            timeout=120,
        )
        output = result.stdout + result.stderr
        return output[:8000]
    except Exception as e:
        return f"Error running tests: {e}"


@tool("Lint Code")
def lint_code_tool(file_path: str) -> str:
    """Run ruff linter on a file"""
    try:
        import subprocess

        base_path = Path(__file__).parent.parent
        result = subprocess.run(
            ["ruff", "check", file_path],
            capture_output=True,
            text=True,
            cwd=str(base_path),
            timeout=30,
        )
        return (
            result.stdout + result.stderr
            if (result.stdout or result.stderr)
            else "No linting issues found"
        )
    except Exception as e:
        return f"Error linting: {e}"


# ============================================================================
# AGENT DEFINITIONS
# ============================================================================


def create_security_auditor() -> Agent:
    """Security-focused code review agent"""
    return Agent(
        role="Security Auditor",
        goal="Identify security vulnerabilities, SQL injection risks, and authentication issues",
        backstory=f"""You are a senior security researcher specializing in OWASP Top 10
vulnerabilities with expertise in Python/FastAPI and React Native applications.
{PROJECT_CONTEXT}
Focus on: SQL injection (CWE-89), CORS misconfiguration (CWE-942),
authentication bypasses, and sensitive data exposure.""",
        tools=[read_file_tool, search_code_tool, lint_code_tool],
        verbose=True,
        allow_delegation=False,
    )


def create_code_reviewer() -> Agent:
    """Code quality and best practices agent"""
    return Agent(
        role="Senior Code Reviewer",
        goal="Review code for quality, maintainability, and adherence to project patterns",
        backstory=f"""You are a principal engineer with 15+ years of experience in
Python and TypeScript. You enforce clean code principles and project-specific patterns.
{PROJECT_CONTEXT}
Ensure: Type hints, docstrings, error handling, and consistent API patterns.""",
        tools=[read_file_tool, list_dir_tool, search_code_tool],
        verbose=True,
        allow_delegation=True,
    )


def create_test_engineer() -> Agent:
    """Testing and quality assurance agent"""
    return Agent(
        role="Test Engineer",
        goal="Generate comprehensive test cases and identify testing gaps",
        backstory=f"""You are a QA engineer specializing in pytest and Jest testing.
{PROJECT_CONTEXT}
Focus on: Unit tests, integration tests, edge cases, error scenarios,
and API contract validation. Target 80%+ coverage.""",
        tools=[read_file_tool, run_tests_tool, search_code_tool],
        verbose=True,
        allow_delegation=False,
    )


def create_documentation_writer() -> Agent:
    """Documentation generation agent"""
    return Agent(
        role="Technical Writer",
        goal="Generate clear, comprehensive documentation for code and APIs",
        backstory=f"""You are a technical writer who creates developer-focused
documentation following Google/NumPy docstring conventions.
{PROJECT_CONTEXT}
Generate: Docstrings, README sections, API documentation, and usage examples.""",
        tools=[read_file_tool, list_dir_tool],
        verbose=True,
        allow_delegation=False,
    )


def create_debugger() -> Agent:
    """Bug analysis and debugging agent"""
    return Agent(
        role="Debug Specialist",
        goal="Analyze errors, identify root causes, and propose fixes",
        backstory=f"""You are a debugging expert who systematically analyzes issues,
traces execution paths, and identifies root causes.
{PROJECT_CONTEXT}
Approach: Gather symptoms → Form hypotheses → Verify with evidence → Propose fix.""",
        tools=[read_file_tool, search_code_tool, run_tests_tool, lint_code_tool],
        verbose=True,
        allow_delegation=True,
    )


# ============================================================================
# TASK DEFINITIONS
# ============================================================================


def create_security_audit_task(file_path: str, agent: Agent) -> Task:
    """Create a security audit task"""
    return Task(
        description=f"""Perform a comprehensive security audit on: {file_path}

Scan for:
1. SQL Injection vulnerabilities (string concatenation in queries)
2. CORS misconfiguration (wildcard origins)
3. Authentication/authorization issues
4. Sensitive data exposure in logs
5. Input validation gaps
6. JWT token handling issues

For each finding, provide:
- Severity (Critical/High/Medium/Low)
- CWE number
- OWASP category
- Exact line number
- Exploitation scenario
- Remediation code""",
        expected_output="""Security audit report in XML format with <security-finding> tags:
<security-finding>
Severity: [Critical|High|Medium|Low]
CWE: CWE-XXX
OWASP: A0X:2021 - [Category]
File: [path]
Line: [number]
Issue: [description]
Exploit: [how to exploit]
Fix: [specific remediation code]
</security-finding>""",
        agent=agent,
    )


def create_code_review_task(file_path: str, agent: Agent) -> Task:
    """Create a code review task"""
    return Task(
        description=f"""Review the code in: {file_path}

Evaluate:
1. Code organization and structure
2. Type hints and annotations
3. Error handling patterns
4. Docstring completeness
5. Adherence to project patterns (API router, Mongo/SQL access)
6. Performance considerations
7. DRY principle compliance

Provide specific, actionable feedback with code examples.""",
        expected_output="""Code review report with sections:
## Summary
[Brief overview]

## Strengths
- [Good patterns observed]

## Issues
### [Category]
- **Location**: [file:line]
- **Issue**: [description]
- **Recommendation**: [specific fix with code]

## Suggested Refactors
[Optional improvements]""",
        agent=agent,
    )


def create_test_generation_task(file_path: str, agent: Agent) -> Task:
    """Create a test generation task"""
    return Task(
        description=f"""Generate comprehensive tests for: {file_path}

Requirements:
1. Identify all functions/methods to test
2. Generate unit tests with pytest
3. Include edge cases and error scenarios
4. Use fixtures for common setup
5. Mock external dependencies (MongoDB, SQL Server)
6. Target 80%+ coverage

Follow project testing patterns from backend/tests/.""",
        expected_output="""Complete pytest test file with:
- Imports and fixtures
- Test class or functions for each feature
- Happy path tests
- Edge case tests
- Error scenario tests
- Docstrings explaining each test""",
        agent=agent,
    )


def create_documentation_task(file_path: str, agent: Agent) -> Task:
    """Create a documentation task"""
    return Task(
        description=f"""Generate documentation for: {file_path}

Create:
1. Module-level docstring
2. Function/method docstrings (Google style)
3. Usage examples
4. Parameter descriptions with types
5. Return value documentation
6. Exception documentation

Follow the project's documentation standards.""",
        expected_output="""Documentation in Google docstring format:
```python
\"\"\"Module description.

Detailed explanation of the module's purpose.

Example:
    >>> from module import function
    >>> result = function(param)

Attributes:
    CONSTANT: Description

Functions:
    function_name: Brief description
\"\"\"
```

Plus individual function docstrings.""",
        agent=agent,
    )


def create_debug_task(error_message: str, agent: Agent) -> Task:
    """Create a debugging task"""
    return Task(
        description=f"""Debug the following issue: {error_message}

Process:
1. Parse the error message/stack trace
2. Identify affected files and lines
3. Search for related code patterns
4. Form hypotheses about root cause
5. Verify with evidence
6. Propose fix with code

Consider: Recent changes, edge cases, async issues, type mismatches.""",
        expected_output="""Debug report:
<investigation>
Symptoms:
- [What's happening]
- [Error messages]
</investigation>

<root-cause>
The issue is caused by: [explanation]
Evidence: [proof]
</root-cause>

<fix>
```python
# Before
[problematic code]

# After
[fixed code]
```
</fix>

<verification>
Test with: [verification steps]
</verification>""",
        agent=agent,
    )


# ============================================================================
# CREW ORCHESTRATION
# ============================================================================


class StockVerifyCrew:
    """Main crew orchestrator for Stock Verify development tasks"""

    def __init__(self):
        self.security_auditor = create_security_auditor()
        self.code_reviewer = create_code_reviewer()
        self.test_engineer = create_test_engineer()
        self.doc_writer = create_documentation_writer()
        self.debugger = create_debugger()

    def run_security_audit(self, file_path: str) -> str:
        """Run security audit on a file"""
        task = create_security_audit_task(file_path, self.security_auditor)
        crew = Crew(
            agents=[self.security_auditor], tasks=[task], verbose=True, process=Process.sequential
        )
        return crew.kickoff()

    def run_code_review(self, file_path: str) -> str:
        """Run code review on a file"""
        task = create_code_review_task(file_path, self.code_reviewer)
        crew = Crew(
            agents=[self.code_reviewer], tasks=[task], verbose=True, process=Process.sequential
        )
        return crew.kickoff()

    def generate_tests(self, file_path: str) -> str:
        """Generate tests for a file"""
        task = create_test_generation_task(file_path, self.test_engineer)
        crew = Crew(
            agents=[self.test_engineer], tasks=[task], verbose=True, process=Process.sequential
        )
        return crew.kickoff()

    def generate_docs(self, file_path: str) -> str:
        """Generate documentation for a file"""
        task = create_documentation_task(file_path, self.doc_writer)
        crew = Crew(
            agents=[self.doc_writer], tasks=[task], verbose=True, process=Process.sequential
        )
        return crew.kickoff()

    def debug_issue(self, error_message: str) -> str:
        """Debug an issue"""
        task = create_debug_task(error_message, self.debugger)
        crew = Crew(agents=[self.debugger], tasks=[task], verbose=True, process=Process.sequential)
        return crew.kickoff()

    def full_review(self, file_path: str) -> str:
        """Run full review: security + code quality + tests"""
        security_task = create_security_audit_task(file_path, self.security_auditor)
        review_task = create_code_review_task(file_path, self.code_reviewer)
        test_task = create_test_generation_task(file_path, self.test_engineer)

        crew = Crew(
            agents=[self.security_auditor, self.code_reviewer, self.test_engineer],
            tasks=[security_task, review_task, test_task],
            verbose=True,
            process=Process.sequential,
        )
        return crew.kickoff()


# ============================================================================
# CLI INTERFACE
# ============================================================================


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Stock Verify AI Crew")
    parser.add_argument(
        "--task",
        choices=["security", "review", "test", "docs", "debug", "full"],
        required=True,
        help="Type of task to run",
    )
    parser.add_argument("--file", type=str, help="File path to analyze")
    parser.add_argument("--error", type=str, help="Error message for debugging")

    args = parser.parse_args()

    # Check for API key
    if not os.getenv("OPENAI_API_KEY") and not os.getenv("GROQ_API_KEY"):
        print("⚠️  Set OPENAI_API_KEY or GROQ_API_KEY environment variable")
        print("   export OPENAI_API_KEY=your-key-here")
        sys.exit(1)

    crew = StockVerifyCrew()

    if args.task == "security" and args.file:
        result = crew.run_security_audit(args.file)
    elif args.task == "review" and args.file:
        result = crew.run_code_review(args.file)
    elif args.task == "test" and args.file:
        result = crew.generate_tests(args.file)
    elif args.task == "docs" and args.file:
        result = crew.generate_docs(args.file)
    elif args.task == "debug" and args.error:
        result = crew.debug_issue(args.error)
    elif args.task == "full" and args.file:
        result = crew.full_review(args.file)
    else:
        parser.print_help()
        sys.exit(1)

    print("\n" + "=" * 80)
    print("RESULT")
    print("=" * 80)
    print(result)


if __name__ == "__main__":
    main()
