/**
 * Network Status Hook Tests
 * Tests for useNetworkStatus hook
 */

import React from "react";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import NetInfo from "@react-native-community/netinfo";
import { useNetworkStatus } from "../useNetworkStatus";
import { useNetworkStore } from "../../store/networkStore";

type MockNetInfoState = {
  isConnected: boolean | null;
  isInternetReachable: boolean | null;
  type: string;
};

const mockNetInfo = NetInfo as unknown as {
  addEventListener: jest.Mock<(cb: (state: any) => void) => () => void>;
  fetch: jest.Mock<() => Promise<MockNetInfoState>>;
};


const makeFetchResponse = (status: number, json: any = { status: "healthy" }) =>
  Promise.resolve({
    status,
    ok: status >= 200 && status < 300,
    headers: {
      get: () => "application/json",
    },
    json: async () => json,
  });

const TestComponent = ({ enabled = true }: { enabled?: boolean }) => {
  const { isOnline, backendReachability } = useNetworkStatus({ enabled });
  return React.createElement(
    Text,
    { testID: "status" },
    `${String(isOnline)}-${backendReachability}`,
  );
};

describe("useNetworkStatus Hook", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Ensure NetInfo methods are Jest mocks (some environments load real implementations)
    mockNetInfo.fetch = jest.fn() as any;
    mockNetInfo.addEventListener = jest.fn() as any;

    useNetworkStore.setState({
      isOnline: true,
      isInternetReachable: null,
      connectionType: "unknown",
      backendReachability: "UNKNOWN",
      backendHealthStatus: null,
      lastBackendPingAt: null,
      backendLatencyMs: null,
    });

    // Mock global fetch used by backend reachability ping
    // @ts-expect-error - test env
    global.fetch = jest.fn(() => makeFetchResponse(200));
  });

  it("should initialize with default network state", () => {
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: "wifi",
    });
    mockNetInfo.addEventListener.mockImplementation(() => () => undefined);

    const { getByTestId } = render(React.createElement(TestComponent, null));
    expect(getByTestId("status").props.children).toContain("true");
  });

  it("should update when network state changes", async () => {
    const unsubscribe = jest.fn();
    let listener: ((state: any) => void) | undefined;

    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: "wifi",
    });
    mockNetInfo.addEventListener.mockImplementation((cb: any) => {
      listener = cb;
      return unsubscribe;
    });

    const { getByTestId } = render(React.createElement(TestComponent, null));

    expect(getByTestId("status").props.children).toContain("true");

    // Wait for the initial fetch to resolve to avoid race condition overwriting the update
    await new Promise((resolve) => setTimeout(resolve, 0));

    listener?.({ isConnected: false, isInternetReachable: false, type: "none" });

    await waitFor(() => {
      expect(getByTestId("status").props.children).toContain("false");
    });
  });

  it("should detect online to offline transition", () => {
    const { setIsOnline } = useNetworkStore.getState();
    setIsOnline(true);
    expect(useNetworkStore.getState().isOnline).toBe(true);
    setIsOnline(false);
    expect(useNetworkStore.getState().isOnline).toBe(false);
  });

  it("should detect offline to online transition", () => {
    const { setIsOnline } = useNetworkStore.getState();
    setIsOnline(false);
    expect(useNetworkStore.getState().isOnline).toBe(false);
    setIsOnline(true);
    expect(useNetworkStore.getState().isOnline).toBe(true);
  });

  it("should cleanup listeners on unmount", () => {
    const unsubscribe = jest.fn();
    mockNetInfo.fetch.mockResolvedValue({
      isConnected: true,
      isInternetReachable: true,
      type: "wifi",
    });
    mockNetInfo.addEventListener.mockImplementation(() => unsubscribe);

    const { unmount } = render(React.createElement(TestComponent, null));
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
