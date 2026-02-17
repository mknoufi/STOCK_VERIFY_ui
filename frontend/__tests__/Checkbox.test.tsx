import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { Checkbox } from "../src/components/ui/Checkbox";

describe("Checkbox Component", () => {
  it("renders correctly with accessibility props", () => {
    const onChange = jest.fn();
    const { getByRole, getByLabelText } = render(
      <Checkbox
        checked={false}
        onChange={onChange}
        label="Accept Terms"
        description="Please read carefully"
      />
    );

    const checkbox = getByRole("checkbox");
    expect(checkbox).toBeTruthy();
    expect(checkbox.props.accessibilityState.checked).toBe(false);
    expect(checkbox.props.accessibilityState.disabled).toBe(false);
    expect(checkbox.props.accessibilityLabel).toBe("Accept Terms");
  });

  it("handles toggle interaction", () => {
    const onChange = jest.fn();
    const { getByRole } = render(
      <Checkbox checked={false} onChange={onChange} label="Accept Terms" />
    );

    const checkbox = getByRole("checkbox");
    fireEvent.press(checkbox);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("renders disabled state correctly", () => {
    const onChange = jest.fn();
    const { getByRole } = render(
      <Checkbox
        checked={true}
        onChange={onChange}
        label="Accept Terms"
        disabled
      />
    );

    const checkbox = getByRole("checkbox");
    expect(checkbox.props.accessibilityState.disabled).toBe(true);
    fireEvent.press(checkbox);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders indeterminate state correctly", () => {
    const onChange = jest.fn();
    const { getByRole } = render(
      <Checkbox
        checked={false}
        onChange={onChange}
        label="Select All"
        indeterminate
      />
    );

    const checkbox = getByRole("checkbox");
    expect(checkbox.props.accessibilityState.checked).toBe("mixed");
  });
});
