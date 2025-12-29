const DUPLICATE_THRESHOLD_MS = 3000; // 3 seconds

interface ScanHistory {
  barcode: string;
  timestamp: number;
}

export class ScanDeduplicationService {
  private lastScan: ScanHistory | null = null;

  /**
   * Check if a barcode is a duplicate scan within the threshold
   * @param barcode The barcode to check
   * @returns { isDuplicate: boolean; reason?: string }
   */
  checkDuplicate(barcode: string): { isDuplicate: boolean; reason?: string } {
    if (!this.lastScan) {
      return { isDuplicate: false };
    }

    if (this.lastScan.barcode === barcode) {
      const timeDiff = Date.now() - this.lastScan.timestamp;
      if (timeDiff < DUPLICATE_THRESHOLD_MS) {
        const secondsAgo = Math.round(timeDiff / 100) / 10;
        return {
          isDuplicate: true,
          reason: `Duplicate scan ignored (Scanned ${secondsAgo}s ago)`,
        };
      }
    }

    return { isDuplicate: false };
  }

  /**
   * Record a successful scan
   * @param barcode The barcode that was successfully processed
   */
  recordScan(barcode: string) {
    this.lastScan = {
      barcode,
      timestamp: Date.now(),
    };
  }

  /**
   * Reset the scan history (e.g., when switching sessions)
   */
  resetHistory() {
    this.lastScan = null;
  }
}

export const scanDeduplicationService = new ScanDeduplicationService();
