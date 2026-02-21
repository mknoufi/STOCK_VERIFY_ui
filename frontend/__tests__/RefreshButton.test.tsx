import React from 'react';
import { render } from '@testing-library/react-native';
import { RefreshButton } from '../src/components/RefreshButton';

describe('RefreshButton', () => {
  it('renders correctly with default props', () => {
    const onRefreshMock = jest.fn();
    const { getByRole, getByLabelText } = render(<RefreshButton onRefresh={onRefreshMock} />);

    const button = getByRole('button');
    expect(button).toBeTruthy();
    expect(getByLabelText('Refresh content')).toBeTruthy();
    expect(button.props.accessibilityHint).toBe('Reloads the current view');
  });

  it('renders correctly with custom props', () => {
    const onRefreshMock = jest.fn();
    const { getByRole, getByLabelText } = render(
      <RefreshButton
        onRefresh={onRefreshMock}
        accessibilityLabel="Update list"
        accessibilityHint="Fetches new data"
      />
    );

    const button = getByRole('button');
    expect(button).toBeTruthy();
    expect(getByLabelText('Update list')).toBeTruthy();
    expect(button.props.accessibilityHint).toBe('Fetches new data');
  });

  it('shows loading state correctly', () => {
    const onRefreshMock = jest.fn();
    const { getByRole, getByLabelText } = render(<RefreshButton onRefresh={onRefreshMock} loading={true} />);

    const button = getByRole('button');
    expect(button.props.accessibilityState.busy).toBe(true);
    expect(button.props.accessibilityState.disabled).toBe(true);
    expect(getByLabelText('Loading...')).toBeTruthy();
  });
});
