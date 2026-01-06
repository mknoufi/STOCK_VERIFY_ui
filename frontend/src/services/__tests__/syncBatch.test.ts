import { syncOfflineQueue } from "../syncManager";
import * as api from "../api/api";
import * as offlineStorage from "../offline/offlineStorage";

// Mock dependencies
jest.mock("../api/api");
jest.mock("../offline/offlineStorage");
jest.mock(
  "@react-native-async-storage/async-storage",
  () =>
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@react-native-async-storage/async-storage/jest/async-storage-mock")
      .default,
);

describe("syncOfflineQueue", () => {
  const mockOperations = [
    {
      id: "op_1",
      type: "count_line",
      data: {
        _id: "rec_1",
        session_id: "sess_1",
        item_code: "ITEM001",
        counted_qty: 10,
        damaged_qty: 0,
        serial_numbers: [],
        created_at: "2023-01-01T00:00:00Z",
      },
      timestamp: "2023-01-01T00:00:00Z",
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock implementations
    (offlineStorage.getOfflineQueue as jest.Mock).mockResolvedValue(
      mockOperations,
    );
    (offlineStorage.getCacheStats as jest.Mock).mockResolvedValue({
      queuedOperations: 1,
    });
    (api.isOnline as jest.Mock).mockReturnValue(true);
    (api.syncBatch as jest.Mock).mockResolvedValue({
      results: [{ id: "rec_1", success: true }],
    });
    (offlineStorage.removeManyFromOfflineQueue as jest.Mock).mockResolvedValue(
      undefined,
    );
    (offlineStorage.updateQueueItemRetries as jest.Mock).mockResolvedValue(
      undefined,
    );
  });

  it("should sync operations from offline queue", async () => {
    const result = await syncOfflineQueue();

    // Verify API called with transformed operations
    expect(api.syncBatch).toHaveBeenCalledWith(
      [
        expect.objectContaining({
          client_record_id: "rec_1",
          session_id: "sess_1",
          item_code: "ITEM001",
          verified_qty: 10,
          status: "partial",
        }),
      ],
      [],
    );

    // Verify success handling
    expect(result.success).toBe(1);
    expect(result.failed).toBe(0);
    expect(offlineStorage.removeManyFromOfflineQueue).toHaveBeenCalledWith([
      "rec_1",
    ]);
  });

  it("should handle ignored operations (empty queue)", async () => {
    (offlineStorage.getOfflineQueue as jest.Mock).mockResolvedValue([]);

    const result = await syncOfflineQueue();

    expect(api.syncBatch).not.toHaveBeenCalled();
    expect(result.total).toBe(0);
  });

  it("should handle partial failures", async () => {
    (api.syncBatch as jest.Mock).mockResolvedValue({
      results: [{ id: "rec_1", success: false, message: "Duplicate record" }],
    });

    const result = await syncOfflineQueue();

    expect(result.failed).toBe(1);
    expect(result.success).toBe(0);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        id: "rec_1",
        error: "Duplicate record",
      }),
    );
    // Should NOT remove failed items
    expect(offlineStorage.removeManyFromOfflineQueue).not.toHaveBeenCalled();
    // Should update retries
    expect(offlineStorage.updateQueueItemRetries).toHaveBeenCalledWith("rec_1");
  });

  it("should not sync when offline", async () => {
    (api.isOnline as jest.Mock).mockReturnValue(false);

    const result = await syncOfflineQueue();

    expect(api.syncBatch).not.toHaveBeenCalled();
    expect(result.total).toBe(0);
  });
});
