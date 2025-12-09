import React from "react";
import { render, fireEvent } from "@testing-library/react-native";
import { LocationVerificationSection } from "@/components/scan/LocationVerificationSection";

describe("LocationVerificationSection", () => {
  it("calls onSelectFloor when a floor chip is pressed", () => {
    const onSelectFloor = jest.fn();
    const { getByTestId } = render(
      <LocationVerificationSection
        floorNo={null}
        rackNo={null}
        onSelectFloor={onSelectFloor}
        onChangeRack={jest.fn()}
        username="tester"
      />,
    );

    const chip = getByTestId("chip-floor-ground");
    fireEvent.press(chip);

    expect(onSelectFloor).toHaveBeenCalledWith("Ground");
  });

  it("calls onChangeRack when rack input changes", () => {
    const onChangeRack = jest.fn();
    const { getByTestId } = render(
      <LocationVerificationSection
        floorNo={"First"}
        rackNo={"R-1"}
        onSelectFloor={jest.fn()}
        onChangeRack={onChangeRack}
        username="tester"
      />,
    );

    const input = getByTestId("input-rack");
    fireEvent.changeText(input, "R-99");

    expect(onChangeRack).toHaveBeenCalledWith("R-99");
  });
});
