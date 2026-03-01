import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { QuantityStepper } from "../src/components/ui/QuantityStepper";

// Mock Haptics
jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: "light",
  },
}));

// Mock Ionicons
jest.mock("@expo/vector-icons", () => ({
  Ionicons: "Ionicons",
}));

describe("QuantityStepper Component", () => {
  it("renders correctly with initial value", () => {
    const { getByText } = render(
      <QuantityStepper value={5} onChange={jest.fn()} />
    );
    expect(getByText("5")).toBeTruthy();
  });

  it("handles increment", () => {
    const mockOnChange = jest.fn();
    const { getByLabelText } = render(
      <QuantityStepper value={5} onChange={mockOnChange} />
    );

    // This will fail initially because accessibilityLabel is "increment" not "Increase quantity"
    // Or rather, the plan is to CHANGE it to "Increase quantity".
    // Currently the code has accessibilityLabel="increment".
    // I will write the test to expect the NEW labels, so it fails first.
    const incrementButton = getByLabelText("Increase quantity");
    fireEvent.press(incrementButton);
    expect(mockOnChange).toHaveBeenCalledWith(6);
  });

  it("handles decrement", () => {
    const mockOnChange = jest.fn();
    const { getByLabelText } = render(
      <QuantityStepper value={5} onChange={mockOnChange} />
    );

    const decrementButton = getByLabelText("Decrease quantity");
    fireEvent.press(decrementButton);
    expect(mockOnChange).toHaveBeenCalledWith(4);
  });

  it("respects min value", () => {
    const mockOnChange = jest.fn();
    const { getByLabelText } = render(
      <QuantityStepper value={0} min={0} onChange={mockOnChange} />
    );

    const decrementButton = getByLabelText("Decrease quantity");
    // Check if button is disabled via accessibilityState
    expect(decrementButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(decrementButton);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("respects max value", () => {
    const mockOnChange = jest.fn();
    const { getByLabelText } = render(
      <QuantityStepper value={10} max={10} onChange={mockOnChange} />
    );

    const incrementButton = getByLabelText("Increase quantity");
    expect(incrementButton.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(incrementButton);
    expect(mockOnChange).not.toHaveBeenCalled();
  });

  it("has correct accessibility hints", () => {
    const { getByLabelText } = render(
      <QuantityStepper value={5} onChange={jest.fn()} />
    );

    const incrementButton = getByLabelText("Increase quantity");
    expect(incrementButton.props.accessibilityHint).toBe("Double tap to increase value");

    const decrementButton = getByLabelText("Decrease quantity");
    expect(decrementButton.props.accessibilityHint).toBe("Double tap to decrease value");
  });

  it("has correct accessibility role", () => {
    const { getByLabelText } = render(
        <QuantityStepper value={5} onChange={jest.fn()} />
      );

      const incrementButton = getByLabelText("Increase quantity");
      expect(incrementButton.props.accessibilityRole).toBe("button");
  });
});
