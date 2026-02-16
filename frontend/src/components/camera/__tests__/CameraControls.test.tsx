import React from 'react';
import { render } from '@testing-library/react-native';
import { CameraControls } from '../CameraControls';

describe('CameraControls', () => {
  const mockProps = {
    torchEnabled: false,
    zoom: 0,
    onToggleTorch: jest.fn(),
    onZoomIn: jest.fn(),
    onZoomOut: jest.fn(),
    onResetZoom: jest.fn(),
  };

  it('renders torch button with correct accessibility label', () => {
    const { getByLabelText } = render(<CameraControls {...mockProps} />);

    expect(getByLabelText('Turn flash on')).toBeTruthy();
  });

  it('renders zoom buttons with correct accessibility labels', () => {
    const { getByLabelText } = render(<CameraControls {...mockProps} />);

    expect(getByLabelText('Zoom in')).toBeTruthy();
    expect(getByLabelText('Zoom out')).toBeTruthy();
  });

  it('renders reset zoom button with correct accessibility label', () => {
    const { getByLabelText } = render(<CameraControls {...mockProps} />);

    expect(getByLabelText('Reset zoom level')).toBeTruthy();
  });

  it('updates torch accessibility label when enabled', () => {
    const { getByLabelText } = render(
      <CameraControls {...mockProps} torchEnabled={true} />
    );

    expect(getByLabelText('Turn flash off')).toBeTruthy();
  });

  it('includes accessibility hints for better context', () => {
    const { getByLabelText } = render(<CameraControls {...mockProps} />);

    const torchButton = getByLabelText('Turn flash on');
    expect(torchButton.props.accessibilityHint).toBe('Double tap to toggle camera flash');

    const zoomInButton = getByLabelText('Zoom in');
    expect(zoomInButton.props.accessibilityHint).toBe('Increases camera zoom level');

    const zoomOutButton = getByLabelText('Zoom out');
    expect(zoomOutButton.props.accessibilityHint).toBe('Decreases camera zoom level');

    const resetButton = getByLabelText('Reset zoom level');
    expect(resetButton.props.accessibilityHint).toBe('Resets zoom to 100%');
  });
});
