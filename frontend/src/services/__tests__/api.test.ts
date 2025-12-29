/**
 * API Service Tests
 * Tests for core API functionality
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { isOnline } from "../api/api";
import { useNetworkStore } from "../../store/networkStore";

// Mock dependencies
jest.mock("../../store/networkStore", () => ({
  useNetworkStore: {
    getState: jest.fn(() => ({
      isOnline: true,
      isInternetReachable: true,
      connectionType: "wifi",
    })),
  },
}));

jest.mock("../httpClient", () => ({
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

jest.mock("../offline/offlineStorage", () => ({
  addToOfflineQueue: jest.fn(),
  cacheItem: jest.fn(),
  searchItemsInCache: jest.fn(() => Promise.resolve([])),
  cacheSession: jest.fn(),
  getSessionsCache: jest.fn(() => Promise.resolve([])),
  getSessionFromCache: jest.fn(() => Promise.resolve(null)),
  cacheCountLine: jest.fn(),
  getCountLinesBySessionFromCache: jest.fn(() => Promise.resolve([])),
}));

describe("API Service - Network Detection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when online and internet reachable", () => {
    (useNetworkStore.getState as jest.Mock).mockReturnValue({
      isOnline: true,
      isInternetReachable: true,
      connectionType: "wifi",
    });

    expect(isOnline()).toBe(true);
  });

  it("should return false when offline", () => {
    (useNetworkStore.getState as jest.Mock).mockReturnValue({
      isOnline: false,
      isInternetReachable: false,
      connectionType: "none",
    });

    expect(isOnline()).toBe(false);
  });

  it("should return false when internet not reachable", () => {
    (useNetworkStore.getState as jest.Mock).mockReturnValue({
      isOnline: true,
      isInternetReachable: false,
      connectionType: "cellular",
    });

    expect(isOnline()).toBe(false);
  });

  it("should assume online when network state is unknown", () => {
    (useNetworkStore.getState as jest.Mock).mockReturnValue({
      isOnline: undefined,
      isInternetReachable: undefined,
      connectionType: undefined,
    });

    expect(isOnline()).toBe(true);
  });

  it("should assume online when network state is null", () => {
    (useNetworkStore.getState as jest.Mock).mockReturnValue({
      isOnline: null,
      isInternetReachable: null,
      connectionType: null,
    });

    expect(isOnline()).toBe(true);
  });
});
