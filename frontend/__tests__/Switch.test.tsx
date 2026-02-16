import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Switch } from "../src/components/ui/Switch";

describe("Switch Component", () => {
  it("renders correctly with accessibility props", () => {
    const mockOnValueChange = jest.fn();
    const { getByRole, getByLabelText } = render(
      <Switch
        value={true}
        onValueChange={mockOnValueChange}
        accessibilityLabel="Test Switch"
        accessibilityHint="Toggles the test setting"
      />
    );

    const switchElement = getByRole("switch");
    expect(switchElement).toBeTruthy();
    expect(switchElement.props.accessibilityLabel).toBe("Test Switch");
    expect(switchElement.props.accessibilityHint).toBe("Toggles the test setting");

    // Check state (checked: true)
    // Note: implementation uses accessibilityState={{ checked: value, disabled }}
    expect(switchElement.props.accessibilityState.checked).toBe(true);
  });

  it("handles toggle interaction", () => {
    const mockOnValueChange = jest.fn();
    const { getByRole } = render(
      <Switch
        value={false}
        onValueChange={mockOnValueChange}
        accessibilityLabel="Test Switch"
      />
    );

    const switchElement = getByRole("switch");
    fireEvent.press(switchElement);
    expect(mockOnValueChange).toHaveBeenCalledWith(true);
  });

  it("renders disabled state correctly", () => {
    const mockOnValueChange = jest.fn();
    const { getByRole } = render(
      <Switch
        value={false}
        onValueChange={mockOnValueChange}
        disabled={true}
        accessibilityLabel="Disabled Switch"
      />
    );

    const switchElement = getByRole("switch");
    expect(switchElement.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(switchElement);
    expect(mockOnValueChange).not.toHaveBeenCalled();
  });
});
