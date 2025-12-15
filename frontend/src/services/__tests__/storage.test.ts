/**
 * Storage Service Tests
 * Tests for AsyncStorage wrapper and caching
 */

import { describe, it, expect, jest, beforeEach, afterEach } from "@jest/globals";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { asyncStorageService as AsyncStorageService } from "../storage/asyncStorageService";

// Mock AsyncStorage properly regarding hoisting
jest.mock("@react-native-async-storage/async-storage", () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
  multiGet: jest.fn(),
  multiSet: jest.fn(),
  multiRemove: jest.fn(),
}));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSetItem = AsyncStorage.setItem as jest.MockedFunction<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetItem = AsyncStorage.getItem as jest.MockedFunction<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockRemoveItem = AsyncStorage.removeItem as jest.MockedFunction<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockClear = AsyncStorage.clear as jest.MockedFunction<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetAllKeys = AsyncStorage.getAllKeys as jest.MockedFunction<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMultiGet = AsyncStorage.multiGet as jest.MockedFunction<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMultiSet = AsyncStorage.multiSet as jest.MockedFunction<any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockMultiRemove = AsyncStorage.multiRemove as jest.MockedFunction<any>;

describe("AsyncStorageService - Basic Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getItem", () => {
    it("should retrieve and parse JSON data", async () => {
      const testData = { name: "Test Item", value: 123 };
      const storedItem = { value: testData, timestamp: Date.now() };
      mockGetItem.mockResolvedValue(JSON.stringify(storedItem));

      const result = await AsyncStorageService.getItem("test-key");

      expect(mockGetItem).toHaveBeenCalledWith("test-key");
      expect(result).toEqual(testData);
    });

    it("should return null for non-existent keys", async () => {
      mockGetItem.mockResolvedValue(null);

      const result = await AsyncStorageService.getItem("non-existent");

      expect(result).toBeNull();
    });

    it("should return default value when key not found", async () => {
      mockGetItem.mockResolvedValue(null);
      const defaultValue = { default: true };

      const result = await AsyncStorageService.getItem("test-key", {
        defaultValue,
      });

      expect(result).toEqual(defaultValue);
    });

    it("should handle JSON parse errors gracefully", async () => {
      mockGetItem.mockResolvedValue("invalid json {");

      const result = await AsyncStorageService.getItem("test-key");

      expect(result).toBe("invalid json {");
    });
  });

  describe("setItem", () => {
    it("should stringify and store data", async () => {
      const testData = { name: "Test", value: 456 };
      mockSetItem.mockResolvedValue(undefined);

      const result = await AsyncStorageService.setItem("test-key", testData);

      expect(mockSetItem).toHaveBeenCalledWith(
        "test-key",
        expect.stringMatching(/"value":{"name":"Test","value":456}/),
      );
      expect(result).toBe(true);
    });

    it("should handle storage errors", async () => {
      mockSetItem.mockRejectedValue(new Error("Storage full"));

      const result = await AsyncStorageService.setItem("test-key", { data: "test" });

      expect(result).toBe(false);
    });

    it("should store primitive values", async () => {
      mockSetItem.mockResolvedValue(undefined);

      await AsyncStorageService.setItem("string-key", "test string");
      await AsyncStorageService.setItem("number-key", 123);
      await AsyncStorageService.setItem("boolean-key", true);

      expect(mockSetItem).toHaveBeenCalledTimes(3);
    });
  });

  describe("removeItem", () => {
    it("should remove item from storage", async () => {
      mockRemoveItem.mockResolvedValue(undefined);

      const result = await AsyncStorageService.removeItem("test-key");

      expect(mockRemoveItem).toHaveBeenCalledWith("test-key");
      expect(result).toBe(true);
    });

    it("should handle removal errors", async () => {
      mockRemoveItem.mockRejectedValue(new Error("Remove failed"));

      const result = await AsyncStorageService.removeItem("test-key");

      expect(result).toBe(false);
    });
  });

  describe("clearAll", () => {
    it("should clear all storage", async () => {
      mockClear.mockResolvedValue(undefined);

      const result = await AsyncStorageService.clearAll({ confirm: false });

      expect(mockClear).toHaveBeenCalled();
      expect(result).toBe(true);
    });
  });
});

describe("AsyncStorageService - Batch Operations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getMultiple", () => {
    it("should retrieve multiple items", async () => {
      const keys = ["key1", "key2", "key3"];
      const values = [
        ["key1", JSON.stringify({ value: { value: 1 }, timestamp: Date.now() })],
        ["key2", JSON.stringify({ value: { value: 2 }, timestamp: Date.now() })],
        ["key3", JSON.stringify({ value: { value: 3 }, timestamp: Date.now() })],
      ];
      mockMultiGet.mockResolvedValue(values);

      const result = await AsyncStorageService.getMultiple(keys);

      expect(mockMultiGet).toHaveBeenCalledWith(keys);
      expect(result).toEqual({
        key1: { value: 1 },
        key2: { value: 2 },
        key3: { value: 3 },
      });
    });

    it("should handle null values in batch", async () => {
      const keys = ["key1", "key2"];
      const values = [
        ["key1", JSON.stringify({ value: { value: 1 }, timestamp: Date.now() })],
        ["key2", null],
      ];
      mockMultiGet.mockResolvedValue(values);

      const result = await AsyncStorageService.getMultiple(keys);

      expect(result).toEqual({
        key1: { value: 1 },
        key2: null,
      });
    });
  });

  describe("setMultiple", () => {
    it("should store multiple items", async () => {
      const items: [string, any][] = [
        ["key1", { value: 1 }],
        ["key2", { value: 2 }],
      ];
      mockMultiSet.mockResolvedValue(undefined);

      const result = await AsyncStorageService.setMultiple(items);

      expect(mockMultiSet).toHaveBeenCalledWith([
        ["key1", expect.stringMatching(/"value":{"value":1}/)],
        ["key2", expect.stringMatching(/"value":{"value":2}/)],
      ]);
      expect(result).toBe(true);
    });
  });
});

describe("AsyncStorageService - TTL Support", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should store data with TTL metadata", async () => {
    const testData = { name: "Test" };
    const ttl = 1000 * 60 * 60; // 1 hour
    mockSetItem.mockResolvedValue(undefined);
    mockGetItem.mockResolvedValue(null);
    mockRemoveItem.mockResolvedValue(undefined);
    mockClear.mockResolvedValue(undefined);
    mockGetAllKeys.mockResolvedValue([]);

    await AsyncStorageService.setItem("test-key", testData, { expires: ttl });

    const storedValue = mockSetItem.mock.calls[0]?.[1] as string;
    const parsed = JSON.parse(storedValue);

    expect(parsed).toHaveProperty("expires");
    expect(parsed).toHaveProperty("timestamp");
  });

  it("should return null for expired data", async () => {
    const expiredData = {
      value: { name: "Test" },
      expires: Date.now() - 2000, // Expired 1 second ago
      timestamp: Date.now() - 5000,
    };
    mockGetItem.mockResolvedValue(JSON.stringify(expiredData));

    const result = await AsyncStorageService.getItem("test-key");

    expect(result).toBeNull();
  });

  it("should return data that has not expired", async () => {
    const validData = {
      value: { name: "Test" },
      expires: Date.now() + 3600000,
      timestamp: Date.now(),
    };
    mockGetItem.mockResolvedValue(JSON.stringify(validData));

    const result = await AsyncStorageService.getItem("test-key");

    expect(result).toEqual({ name: "Test" });
  });
});
