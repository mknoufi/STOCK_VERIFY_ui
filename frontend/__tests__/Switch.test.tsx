import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Switch } from '../src/components/ui/Switch';

describe('Switch Component', () => {
  it('renders correctly with accessibility props', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(
      <Switch
        value={true}
        onValueChange={onValueChange}
        accessibilityLabel="Test Switch"
      />
    );

    const switchElement = getByRole('switch');
    expect(switchElement).toBeTruthy();
    expect(switchElement.props.accessibilityState.checked).toBe(true);
    expect(switchElement.props.accessibilityLabel).toBe('Test Switch');
  });

  it('handles toggle interactions', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(
      <Switch value={false} onValueChange={onValueChange} />
    );

    const switchElement = getByRole('switch');
    fireEvent.press(switchElement);
    expect(onValueChange).toHaveBeenCalledWith(true);
  });

  it('reports disabled state', () => {
    const onValueChange = jest.fn();
    const { getByRole } = render(
      <Switch value={false} onValueChange={onValueChange} disabled />
    );

    const switchElement = getByRole('switch');
    expect(switchElement.props.accessibilityState.disabled).toBe(true);

    fireEvent.press(switchElement);
    expect(onValueChange).not.toHaveBeenCalled();
  });
});
