/**
 * Inventory Alert Service
 * Background monitoring for critical inventory conditions:
 * - Items expiring soon
 * - Low stock alerts
 * - Sync status monitoring
 */

import { notify } from "../../../services/utils/notificationService";
import InventoryAPI from "./inventoryApi";

export interface AlertThresholds {
  expiryDays: number;      // Alert for items expiring within X days
  lowStockQty: number;     // Alert for items below X units
  criticalExpiryDays: number; // Critical alert for items expiring within X days
}

const DEFAULT_THRESHOLDS: AlertThresholds = {
  expiryDays: 30,
  lowStockQty: 10,
  criticalExpiryDays: 7,
};

export class InventoryAlertService {
  private static checkInterval: ReturnType<typeof setInterval> | null = null;
  private static thresholds: AlertThresholds = DEFAULT_THRESHOLDS;
  private static lastExpiryCount: number = 0;
  private static lastLowStockCount: number = 0;

  /**
   * Start background monitoring
   * @param intervalMinutes How often to check (default 15 minutes)
   * @param thresholds Custom alert thresholds
   */
  static start(
    intervalMinutes: number = 15,
    thresholds: Partial<AlertThresholds> = {}
  ) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    
    // Clear any existing interval
    this.stop();
    
    // Run initial check
    this.checkAlerts();
    
    // Set up recurring checks
    this.checkInterval = setInterval(
      () => this.checkAlerts(),
      intervalMinutes * 60 * 1000
    );
    
    __DEV__ && console.log(`[InventoryAlerts] Started with ${intervalMinutes}min interval`);
  }

  /**
   * Stop background monitoring
   */
  static stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
      __DEV__ && console.log("[InventoryAlerts] Stopped");
    }
  }

  /**
   * Manually trigger an alert check
   */
  static async checkAlerts(): Promise<{
    expiringItems: number;
    lowStockItems: number;
    criticalItems: string[];
  }> {
    const result = {
      expiringItems: 0,
      lowStockItems: 0,
      criticalItems: [] as string[],
    };

    try {
      // Check expiring items
      const expiryData = await InventoryAPI.getExpiryAlerts(this.thresholds.expiryDays);
      result.expiringItems = expiryData.total;
      
      // Only notify if count increased
      if (expiryData.total > this.lastExpiryCount && expiryData.total > 0) {
        notify.expiryAlert(expiryData.total, this.thresholds.expiryDays);
      }
      this.lastExpiryCount = expiryData.total;

      // Check for critical expiry (items expiring within critical threshold)
      const criticalItems = expiryData.items.filter(
        item => item.days_until_expiry <= this.thresholds.criticalExpiryDays
      );
      
      // Notify for each critical item (limit to first 3 to avoid spam)
      criticalItems.slice(0, 3).forEach(item => {
        if (item.days_until_expiry <= 3) {
          notify.criticalExpiry(item.item_name, item.days_until_expiry);
          result.criticalItems.push(item.item_name);
        }
      });

      // Check low stock
      const lowStockData = await InventoryAPI.getLowStock(this.thresholds.lowStockQty);
      result.lowStockItems = lowStockData.total;
      
      // Only notify if count increased
      if (lowStockData.total > this.lastLowStockCount && lowStockData.total > 0) {
        notify.lowStockAlert(lowStockData.total, this.thresholds.lowStockQty);
      }
      this.lastLowStockCount = lowStockData.total;

    } catch (error) {
      __DEV__ && console.error("[InventoryAlerts] Check failed:", error);
    }

    return result;
  }

  /**
   * Get current alert counts (without triggering notifications)
   */
  static async getAlertCounts(): Promise<{
    expiringItems: number;
    lowStockItems: number;
  }> {
    try {
      const [expiryData, lowStockData] = await Promise.all([
        InventoryAPI.getExpiryAlerts(this.thresholds.expiryDays),
        InventoryAPI.getLowStock(this.thresholds.lowStockQty),
      ]);

      return {
        expiringItems: expiryData.total,
        lowStockItems: lowStockData.total,
      };
    } catch {
      return { expiringItems: 0, lowStockItems: 0 };
    }
  }

  /**
   * Update alert thresholds
   */
  static setThresholds(thresholds: Partial<AlertThresholds>) {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Check if monitoring is active
   */
  static isRunning(): boolean {
    return this.checkInterval !== null;
  }
}

export default InventoryAlertService;
