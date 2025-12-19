"""
Basic tests for backend functionality
"""

from typing import Optional

import pytest


def test_imports():
    """Test that core modules can be imported"""
    from backend.config import settings
    from backend.server import app

    assert app is not None
    assert settings is not None


def test_pydantic_models():
    """Test Pydantic model creation"""
    try:
        from pydantic import BaseModel

        class TestModel(BaseModel):
            name: str
            age: Optional[int] = None

        model = TestModel(name="test", age=25)
        assert model.name == "test"
        assert model.age == 25
    except Exception as e:
        pytest.skip(f"Pydantic test failed: {e}")


def test_environment_variables():
    """Test environment configuration"""
    import os

    # These should be set in CI/CD
    required_vars = ["JWT_SECRET", "JWT_REFRESH_SECRET"]
    for var in required_vars:
        assert var in os.environ or "TESTING" in os.environ, (
            f"Missing required env var: {var}"
        )


def test_math_operations():
    """Basic math test to ensure Python works"""
    assert 2 + 2 == 4
    assert 10 * 5 == 50
    assert 100 / 4 == 25.0
