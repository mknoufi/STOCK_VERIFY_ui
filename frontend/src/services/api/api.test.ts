import { getWarehouses } from "./api";
import api from "../httpClient";

// Mock dependencies
jest.mock("../httpClient", () => ({
  get: jest.fn(),
  post: jest.fn(),
}));

jest.mock("../../utils/network", () => ({
  isOnline: jest.fn().mockReturnValue(true),
  getNetworkStatus: jest
    .fn()
    .mockReturnValue({ status: "ONLINE", isOnline: true }),
}));

jest.mock("../offline/offlineStorage", () => ({
  getWarehousesCache: jest.fn().mockReturnValue([]),
}));

describe("API Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getWarehouses", () => {
    it("should URL encode zone parameter", async () => {
      const mockZone = "Showroom Space";
      (api.get as jest.Mock).mockResolvedValue({ data: [] });

      await getWarehouses(mockZone);

      expect(api.get).toHaveBeenCalledWith(
        expect.stringContaining("zone=Showroom%20Space"),
      );
    });

    it("should handle empty zone parameter", async () => {
      (api.get as jest.Mock).mockResolvedValue({ data: [] });

      await getWarehouses();

      expect(api.get).toHaveBeenCalledWith("/api/locations/warehouses");
    });
  });
});
