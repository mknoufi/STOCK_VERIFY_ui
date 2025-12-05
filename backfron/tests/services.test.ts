/**
 * Service Layer Tests
 * Tests for API services, data stores, and utility functions
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Mock API responses
const mockApiResponses = {
  login: {
    success: true,
    data: {
      access_token: "mock_token_12345",
      token_type: "bearer",
      user: {
        id: "1",
        username: "testuser",
        role: "admin",
      },
    },
  },
  items: {
    success: true,
    data: [
      {
        id: "1",
        barcode: "TEST001",
        name: "Test Item 1",
        category: "Electronics",
        quantity: 10,
        location: "Warehouse A",
      },
      {
        id: "2",
        barcode: "TEST002",
        name: "Test Item 2",
        category: "Furniture",
        quantity: 5,
        location: "Warehouse B",
      },
    ],
  },
};

// Mock API Service
class MockApiService {
  private baseURL = "http://localhost:8001";
  private token: string | null = null;

  setAuthToken(token: string) {
    this.token = token;
  }

  async login(username: string, password: string) {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (username === "testuser" && password === "testpass") {
      return mockApiResponses.login;
    }
    throw new Error("Invalid credentials");
  }

  async getItems(filters?: any) {
    if (!this.token) {
      throw new Error("Authentication required");
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
    return mockApiResponses.items;
  }

  async getItemByBarcode(barcode: string) {
    if (!this.token) {
      throw new Error("Authentication required");
    }

    const item = mockApiResponses.items.data.find(
      (item) => item.barcode === barcode,
    );
    if (!item) {
      throw new Error("Item not found");
    }

    return { success: true, data: item };
  }

  async createItem(itemData: any) {
    if (!this.token) {
      throw new Error("Authentication required");
    }

    const newItem = {
      id: Date.now().toString(),
      ...itemData,
    };

    return { success: true, data: newItem };
  }

  async updateItem(id: string, updateData: any) {
    if (!this.token) {
      throw new Error("Authentication required");
    }

    const item = mockApiResponses.items.data.find((item) => item.id === id);
    if (!item) {
      throw new Error("Item not found");
    }

    return { success: true, data: { ...item, ...updateData } };
  }
}

// Mock Auth Store
class MockAuthStore {
  private user: any = null;
  private token: string | null = null;
  private isAuthenticated = false;

  async login(username: string, password: string) {
    const apiService = new MockApiService();

    try {
      const response = await apiService.login(username, password);
      this.token = response.data.access_token;
      this.user = response.data.user;
      this.isAuthenticated = true;

      // Store in AsyncStorage
      await AsyncStorage.setItem("auth_token", this.token);
      await AsyncStorage.setItem("user_data", JSON.stringify(this.user));

      return { success: true, user: this.user };
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    this.user = null;
    this.token = null;
    this.isAuthenticated = false;

    await AsyncStorage.removeItem("auth_token");
    await AsyncStorage.removeItem("user_data");
  }

  async loadStoredAuth() {
    try {
      const token = await AsyncStorage.getItem("auth_token");
      const userData = await AsyncStorage.getItem("user_data");

      if (token && userData) {
        this.token = token;
        this.user = JSON.parse(userData);
        this.isAuthenticated = true;
        return true;
      }

      return false;
    } catch {
      return false;
    }
  }

  getUser() {
    return this.user;
  }

  getToken() {
    return this.token;
  }

  isLoggedIn() {
    return this.isAuthenticated;
  }
}

// Mock Item Store
class MockItemStore {
  private items: any[] = [];
  private loading = false;
  private error: string | null = null;

  async loadItems() {
    this.loading = true;
    this.error = null;

    try {
      const apiService = new MockApiService();
      apiService.setAuthToken("mock_token");

      const response = await apiService.getItems();
      this.items = response.data;
      this.loading = false;
    } catch (error) {
      this.error =
        error instanceof Error ? error.message : "Failed to load items";
      this.loading = false;
      throw error;
    }
  }

  async searchItems(query: string) {
    const filteredItems = this.items.filter(
      (item) =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.barcode.includes(query) ||
        item.category.toLowerCase().includes(query.toLowerCase()),
    );

    return filteredItems;
  }

  async addItem(itemData: any) {
    const apiService = new MockApiService();
    apiService.setAuthToken("mock_token");

    const response = await apiService.createItem(itemData);
    this.items.push(response.data);

    return response.data;
  }

  getItems() {
    return this.items;
  }

  isLoading() {
    return this.loading;
  }

  getError() {
    return this.error;
  }
}

describe("API Service Tests", () => {
  let apiService: MockApiService;

  beforeEach(() => {
    apiService = new MockApiService();
  });

  describe("Authentication", () => {
    test("successful login returns token and user data", async () => {
      const response = await apiService.login("testuser", "testpass");

      expect(response.success).toBe(true);
      expect(response.data.access_token).toBeDefined();
      expect(response.data.user.username).toBe("testuser");
    });

    test("failed login throws error", async () => {
      await expect(apiService.login("invalid", "credentials")).rejects.toThrow(
        "Invalid credentials",
      );
    });

    test("protected endpoints require authentication", async () => {
      await expect(apiService.getItems()).rejects.toThrow(
        "Authentication required",
      );
    });
  });

  describe("Items API", () => {
    beforeEach(() => {
      apiService.setAuthToken("mock_token");
    });

    test("get items returns list of items", async () => {
      const response = await apiService.getItems();

      expect(response.success).toBe(true);
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    test("get item by barcode returns specific item", async () => {
      const response = await apiService.getItemByBarcode("TEST001");

      expect(response.success).toBe(true);
      expect(response.data.barcode).toBe("TEST001");
    });

    test("get non-existent item throws error", async () => {
      await expect(apiService.getItemByBarcode("NONEXISTENT")).rejects.toThrow(
        "Item not found",
      );
    });

    test("create item returns new item with ID", async () => {
      const itemData = {
        barcode: "NEW001",
        name: "New Item",
        category: "Test",
        quantity: 1,
      };

      const response = await apiService.createItem(itemData);

      expect(response.success).toBe(true);
      expect(response.data.id).toBeDefined();
      expect(response.data.barcode).toBe("NEW001");
    });
  });
});

describe("Auth Store Tests", () => {
  let authStore: MockAuthStore;

  beforeEach(async () => {
    authStore = new MockAuthStore();
    // Clear AsyncStorage
    await AsyncStorage.clear();
  });

  test("successful login updates store state", async () => {
    const result = await authStore.login("testuser", "testpass");

    expect(result.success).toBe(true);
    expect(authStore.isLoggedIn()).toBe(true);
    expect(authStore.getUser()).toBeDefined();
    expect(authStore.getToken()).toBeDefined();
  });

  test("login stores data in AsyncStorage", async () => {
    await authStore.login("testuser", "testpass");

    const storedToken = await AsyncStorage.getItem("auth_token");
    const storedUser = await AsyncStorage.getItem("user_data");

    expect(storedToken).toBeDefined();
    expect(storedUser).toBeDefined();
  });

  test("logout clears store and AsyncStorage", async () => {
    await authStore.login("testuser", "testpass");
    await authStore.logout();

    expect(authStore.isLoggedIn()).toBe(false);
    expect(authStore.getUser()).toBeNull();

    const storedToken = await AsyncStorage.getItem("auth_token");
    const storedUser = await AsyncStorage.getItem("user_data");

    expect(storedToken).toBeNull();
    expect(storedUser).toBeNull();
  });

  test("loadStoredAuth restores state from AsyncStorage", async () => {
    // Manually store auth data
    await AsyncStorage.setItem("auth_token", "stored_token");
    await AsyncStorage.setItem(
      "user_data",
      JSON.stringify({ username: "stored_user" }),
    );

    const loaded = await authStore.loadStoredAuth();

    expect(loaded).toBe(true);
    expect(authStore.isLoggedIn()).toBe(true);
    expect(authStore.getToken()).toBe("stored_token");
    expect(authStore.getUser().username).toBe("stored_user");
  });

  test("loadStoredAuth handles missing data gracefully", async () => {
    const loaded = await authStore.loadStoredAuth();

    expect(loaded).toBe(false);
    expect(authStore.isLoggedIn()).toBe(false);
  });
});

describe("Item Store Tests", () => {
  let itemStore: MockItemStore;

  beforeEach(() => {
    itemStore = new MockItemStore();
  });

  test("loadItems populates store with data", async () => {
    await itemStore.loadItems();

    expect(itemStore.getItems().length).toBeGreaterThan(0);
    expect(itemStore.isLoading()).toBe(false);
    expect(itemStore.getError()).toBeNull();
  });

  test("searchItems filters results correctly", async () => {
    await itemStore.loadItems();

    const results = await itemStore.searchItems("Test Item 1");

    expect(results.length).toBe(1);
    expect(results[0].name).toBe("Test Item 1");
  });

  test("searchItems handles multiple matches", async () => {
    await itemStore.loadItems();

    const results = await itemStore.searchItems("Test");

    expect(results.length).toBe(2);
  });

  test("searchItems by category", async () => {
    await itemStore.loadItems();

    const results = await itemStore.searchItems("Electronics");

    expect(results.length).toBe(1);
    expect(results[0].category).toBe("Electronics");
  });

  test("addItem updates local store", async () => {
    const initialCount = itemStore.getItems().length;

    const newItem = {
      barcode: "ADDED001",
      name: "Added Item",
      category: "Test",
    };

    await itemStore.addItem(newItem);

    expect(itemStore.getItems().length).toBe(initialCount + 1);
  });
});

describe("Utility Functions Tests", () => {
  describe("Data Validation", () => {
    const validateItem = (item: any) => {
      const errors: string[] = [];

      if (!item.barcode || item.barcode.trim() === "") {
        errors.push("Barcode is required");
      }

      if (!item.name || item.name.trim() === "") {
        errors.push("Name is required");
      }

      if (
        item.quantity !== undefined &&
        (isNaN(item.quantity) || item.quantity < 0)
      ) {
        errors.push("Quantity must be a non-negative number");
      }

      return errors;
    };

    test("validates complete item successfully", () => {
      const validItem = {
        barcode: "TEST001",
        name: "Test Item",
        quantity: 10,
      };

      const errors = validateItem(validItem);
      expect(errors).toHaveLength(0);
    });

    test("catches missing required fields", () => {
      const invalidItem = {
        quantity: 5,
      };

      const errors = validateItem(invalidItem);
      expect(errors).toContain("Barcode is required");
      expect(errors).toContain("Name is required");
    });

    test("validates quantity constraints", () => {
      const invalidItem = {
        barcode: "TEST001",
        name: "Test Item",
        quantity: -5,
      };

      const errors = validateItem(invalidItem);
      expect(errors).toContain("Quantity must be a non-negative number");
    });
  });

  describe("Data Formatting", () => {
    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(amount);
    };

    const formatDate = (date: Date) => {
      return date.toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    };

    test("formats currency correctly", () => {
      expect(formatCurrency(123.45)).toBe("$123.45");
      expect(formatCurrency(0)).toBe("$0.00");
      expect(formatCurrency(1000)).toBe("$1,000.00");
    });

    test("formats dates correctly", () => {
      const testDate = new Date("2023-12-25");
      expect(formatDate(testDate)).toBe("Dec 25, 2023");
    });
  });

  describe("Network Error Handling", () => {
    const handleApiError = (error: any) => {
      if (error.response) {
        // Server responded with error status
        return {
          type: "server_error",
          message: error.response.data?.message || "Server error occurred",
          status: error.response.status,
        };
      } else if (error.request) {
        // Network error
        return {
          type: "network_error",
          message: "Network connection failed",
          status: null,
        };
      } else {
        // Other error
        return {
          type: "unknown_error",
          message: error.message || "An unexpected error occurred",
          status: null,
        };
      }
    };

    test("handles server errors", () => {
      const serverError = {
        response: {
          status: 500,
          data: { message: "Internal server error" },
        },
      };

      const handled = handleApiError(serverError);

      expect(handled.type).toBe("server_error");
      expect(handled.message).toBe("Internal server error");
      expect(handled.status).toBe(500);
    });

    test("handles network errors", () => {
      const networkError = {
        request: {},
      };

      const handled = handleApiError(networkError);

      expect(handled.type).toBe("network_error");
      expect(handled.message).toBe("Network connection failed");
    });

    test("handles unknown errors", () => {
      const unknownError = {
        message: "Something went wrong",
      };

      const handled = handleApiError(unknownError);

      expect(handled.type).toBe("unknown_error");
      expect(handled.message).toBe("Something went wrong");
    });
  });
});

describe("Performance Tests", () => {
  test("item search performance with large dataset", async () => {
    // Create large dataset
    const largeItemList = Array.from({ length: 1000 }, (_, i) => ({
      id: i.toString(),
      barcode: `ITEM${i.toString().padStart(4, "0")}`,
      name: `Item ${i}`,
      category: i % 2 === 0 ? "Electronics" : "Furniture",
    }));

    const mockStore = new MockItemStore();
    mockStore["items"] = largeItemList; // Direct assignment for test

    const startTime = performance.now();
    const results = await mockStore.searchItems("Item 1");
    const endTime = performance.now();

    const searchTime = endTime - startTime;

    expect(results.length).toBeGreaterThan(0);
    expect(searchTime).toBeLessThan(100); // Should complete within 100ms
  });

  test("async operations handle concurrent requests", async () => {
    const apiService = new MockApiService();
    apiService.setAuthToken("mock_token");

    // Make multiple concurrent requests
    const promises = Array.from({ length: 10 }, (_, i) =>
      apiService.getItemByBarcode(i % 2 === 0 ? "TEST001" : "TEST002"),
    );

    const startTime = performance.now();
    const results = await Promise.all(promises);
    const endTime = performance.now();

    expect(results).toHaveLength(10);
    expect(results.every((r) => r.success)).toBe(true);
    expect(endTime - startTime).toBeLessThan(1000); // Should handle concurrency efficiently
  });
});
