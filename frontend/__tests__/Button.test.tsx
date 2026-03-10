import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Button } from '../src/components/ui/Button';

describe('Button Component', () => {
  it('renders correctly with default accessibility props', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <Button title="Click Me" onPress={mockOnPress} />
    );

    const buttonElement = getByRole('button');
    expect(buttonElement).toBeTruthy();
    expect(buttonElement.props.accessibilityLabel).toBe('Click Me');
    expect(buttonElement.props.accessibilityState).toEqual(expect.objectContaining({ disabled: false, busy: false }));
  });

  it('renders correctly with custom accessibility props', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <Button
        title="Icon Button"
        onPress={mockOnPress}
        accessibilityLabel="Custom Label"
        accessibilityHint="Custom Hint"
      />
    );

    const buttonElement = getByRole('button');
    expect(buttonElement).toBeTruthy();
    expect(buttonElement.props.accessibilityLabel).toBe('Custom Label');
    expect(buttonElement.props.accessibilityHint).toBe('Custom Hint');
  });

  it('renders correctly with disabled and loading state', () => {
    const mockOnPress = jest.fn();
    const { getByRole } = render(
      <Button title="Loading Button" onPress={mockOnPress} loading={true} />
    );

    const buttonElement = getByRole('button');
    expect(buttonElement.props.accessibilityState).toEqual(expect.objectContaining({ disabled: true, busy: true }));

    // Test click on disabled
    fireEvent.press(buttonElement);
    expect(mockOnPress).not.toHaveBeenCalled();
  });
});
