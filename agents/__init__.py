"""
Stock Verify AI Agents
======================

Multi-agent system for development assistance using CrewAI.

Agents:
- Security Auditor: SQL injection, CORS, auth vulnerabilities
- Code Reviewer: Quality, patterns, maintainability
- Test Engineer: Test generation, coverage analysis
- Documentation Writer: Docstrings, API docs
- Debugger: Root cause analysis, fix proposals

Usage:
    from agents import StockVerifyCrew

    crew = StockVerifyCrew()
    result = crew.run_security_audit("backend/server.py")

CLI:
    python -m agents.stock_verify_crew --task security --file backend/server.py
    python -m agents.stock_verify_crew --task review --file backend/api/items.py
    python -m agents.stock_verify_crew --task test --file backend/db_mapping_config.py
    python -m agents.stock_verify_crew --task docs --file backend/config.py
    python -m agents.stock_verify_crew --task debug --error "TypeError: ..."
    python -m agents.stock_verify_crew --task full --file backend/server.py
"""

from .stock_verify_crew import StockVerifyCrew

__all__ = ["StockVerifyCrew"]
__version__ = "1.0.0"
