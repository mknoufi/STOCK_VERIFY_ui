/**
 * API Service Tests
 * Tests for core API functionality
 */

import { describe, it, expect, jest, beforeEach } from "@jest/globals";
import { AppError } from "../../utils/errors";
import { createCountLine, createSession, isOnline } from "../api/api";
import { useNetworkStore } from "../../store/networkStore";
import api from "../httpClient";
import { addToOfflineQueue } from "../offline/offlineStorage";
import { createOfflineCountLine } from "../offline/offlineCountLine";

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
  __esModule: true,
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

jest.mock("../offline/offlineCountLine", () => ({
  createOfflineCountLine: jest.fn(async (payload: any) => ({
    _id: "offline_line_1",
    ...payload,
  })),
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

describe("API Service - Validation vs Offline Fallback", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useNetworkStore.getState as jest.Mock).mockReturnValue({
      isOnline: true,
      isInternetReachable: true,
      connectionType: "wifi",
    });
  });

  it("createSession throws on 400 instead of creating offline session", async () => {
    (api.post as any).mockRejectedValue({
      response: { status: 400, data: { detail: "Warehouse name cannot be empty" } },
      message: "Request failed with status code 400",
    });

    await expect(createSession({ warehouse: "", type: "STANDARD" })).rejects.toBeInstanceOf(
      AppError,
    );
    expect(addToOfflineQueue).not.toHaveBeenCalled();
  });

  it("createCountLine throws on 400 instead of falling back to offline", async () => {
    (api.post as any).mockRejectedValue({
      response: {
        status: 400,
        data: { detail: "Correction reason is mandatory when variance exists" },
      },
      message: "Request failed with status code 400",
    });

    await expect(
      createCountLine({
        session_id: "sess1",
        item_code: "ITEM1",
        counted_qty: 1,
      }),
    ).rejects.toBeInstanceOf(AppError);

    expect(createOfflineCountLine).not.toHaveBeenCalled();
    expect(addToOfflineQueue).not.toHaveBeenCalled();
  });
});
