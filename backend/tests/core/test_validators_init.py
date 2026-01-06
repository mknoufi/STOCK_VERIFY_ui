from __future__ import annotations


def test_core_validators_init_exports() -> None:
    # Importing this package should execute core/validators/__init__.py
    from core.validators import PinValidationResult, validate_pin, validate_pin_change

    result = validate_pin("4826")
    assert isinstance(result, PinValidationResult)
    assert result.is_valid is True

    change_result = validate_pin_change("4826", "4827", confirm_pin="4827")
    assert isinstance(change_result, PinValidationResult)
    assert change_result.is_valid is True
