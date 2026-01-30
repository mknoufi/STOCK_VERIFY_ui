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

  it('renders torch button with accessibility label', () => {
    const { getByLabelText } = render(<CameraControls {...mockProps} />);

    expect(getByLabelText('Turn flash on')).toBeTruthy();
  });

  it('renders zoom buttons with accessibility labels', () => {
    const { getByLabelText } = render(<CameraControls {...mockProps} />);

    expect(getByLabelText('Zoom in')).toBeTruthy();
    expect(getByLabelText('Zoom out')).toBeTruthy();
  });

  it('renders reset zoom button with accessibility label', () => {
    const { getByLabelText } = render(<CameraControls {...mockProps} />);

    expect(getByLabelText('Reset zoom level')).toBeTruthy();
  });

  it('updates torch accessibility label when enabled', () => {
    const { getByLabelText } = render(
      <CameraControls {...mockProps} torchEnabled={true} />
    );

    expect(getByLabelText('Turn flash off')).toBeTruthy();
  });
});
