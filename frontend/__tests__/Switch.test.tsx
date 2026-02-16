
import React from "react";
import { render, fireEvent, screen } from "@testing-library/react-native";
import { Switch } from "../src/components/ui/Switch";

// Mock Reanimated
jest.mock("react-native-reanimated", () => require("react-native-reanimated/mock"));

describe("Switch Component", () => {
  it("renders correctly with default props", () => {
    const onValueChange = jest.fn();
    render(<Switch value={false} onValueChange={onValueChange} />);

    const switchElement = screen.getByRole("switch");
    expect(switchElement).toBeTruthy();
    expect(switchElement.props.accessibilityState.checked).toBe(false);
    expect(switchElement.props.accessibilityState.disabled).toBe(false);
  });

  it("renders correctly when checked", () => {
    const onValueChange = jest.fn();
    render(<Switch value={true} onValueChange={onValueChange} />);

    const switchElement = screen.getByRole("switch");
    expect(switchElement.props.accessibilityState.checked).toBe(true);
  });

  it("renders correctly when disabled", () => {
    const onValueChange = jest.fn();
    render(<Switch value={false} onValueChange={onValueChange} disabled={true} />);

    const switchElement = screen.getByRole("switch");
    expect(switchElement.props.accessibilityState.disabled).toBe(true);
  });

  it("passes accessibility label and hint", () => {
    const onValueChange = jest.fn();
    render(
      <Switch
        value={false}
        onValueChange={onValueChange}
        accessibilityLabel="Notifications"
        accessibilityHint="Double tap to toggle notifications"
      />
    );

    const switchElement = screen.getByLabelText("Notifications");
    expect(switchElement).toBeTruthy();
    expect(switchElement.props.accessibilityHint).toBe("Double tap to toggle notifications");
  });

  it("calls onValueChange when pressed", () => {
    const onValueChange = jest.fn();
    render(<Switch value={false} onValueChange={onValueChange} />);

    const switchElement = screen.getByRole("switch");
    fireEvent.press(switchElement);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it("does not call onValueChange when disabled and pressed", () => {
    const onValueChange = jest.fn();
    render(<Switch value={false} onValueChange={onValueChange} disabled={true} />);

    const switchElement = screen.getByRole("switch");
    fireEvent.press(switchElement);

    expect(onValueChange).not.toHaveBeenCalled();
  });
});
