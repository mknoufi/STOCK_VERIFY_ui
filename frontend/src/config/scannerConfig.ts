/**
 * Scanner Configuration for 1D Barcode Optimization
 * Optimized for common retail/warehouse 1D barcodes
 */

import { BarcodeScanningResult } from 'expo-camera';

/**
 * Supported 1D barcode types for stock verification
 * Focus on the most common formats used in retail/warehouse
 */
export const SUPPORTED_1D_BARCODES = [
  'ean13',      // EAN-13 (Most common retail)
  'ean8',       // EAN-8 (Smaller products)
  'upc_a',      // UPC-A (Common in North America)
  'upc_e',      // UPC-E (Compressed UPC)
  'code128',    // Code 128 (Logistics, shipping)
  'code39',     // Code 39 (Industrial, automotive)
  'code93',     // Code 93 (Similar to Code 39)
  'itf14',      // ITF-14 (Shipping cartons)
  'codabar',    // Codabar (Libraries, FedEx)
] as const;

export type Supported1DBarcode = typeof SUPPORTED_1D_BARCODES[number];

/**
 * Scanner configuration for optimal 1D barcode scanning
 */
export const SCANNER_CONFIG = {
  // Barcode types to scan
  barcodeTypes: SUPPORTED_1D_BARCODES,

  // Scan area configuration (percentage of screen)
  scanArea: {
    // Width of scan area as percentage of screen width
    widthPercent: 90,
    // Height of scan area as percentage of screen height
    heightPercent: 30,
    // Vertical offset from center (positive = down)
    verticalOffset: -10,
  },

  // Scan throttle to prevent duplicate scans
  throttle: {
    // Minimum time between scans of same barcode (ms)
    sameBarcode: 2000,
    // Minimum time between any scans (ms)
    anyBarcode: 500,
  },

  // Haptic feedback settings
  haptics: {
    // Success scan feedback intensity
    successIntensity: 'medium' as const,
    // Error feedback intensity
    errorIntensity: 'light' as const,
    // Enable haptics by default
    enabled: true,
  },

  // Visual feedback settings
  visualFeedback: {
    // Duration of success overlay (ms)
    successDuration: 800,
    // Duration of error overlay (ms)
    errorDuration: 1200,
    // Flash screen on successful scan
    flashOnSuccess: true,
  },

  // Camera settings for better 1D scanning
  camera: {
    // Auto-focus mode
    autoFocus: true,
    // Flash mode (off, on, auto, torch)
    flashMode: 'off' as const,
    // Zoom level (1.0 = no zoom)
    zoom: 0,
    // Ratio for better barcode scanning
    ratio: '16:9',
  },

  // Performance settings
  performance: {
    // Frame analysis interval (higher = less CPU, slower detection)
    analysisIntervalMs: 100,
    // Skip frames if processing is slow
    skipFrames: true,
    // Max concurrent analyses
    maxConcurrentAnalyses: 1,
  },
} as const;

/**
 * Barcode validation utilities
 */
export const BarcodeValidator = {
  /**
   * Check if barcode type is a 1D barcode
   */
  is1DBarcode: (type: string): boolean => {
    const normalized = type.toLowerCase().replace(/[-_]/g, '');
    return SUPPORTED_1D_BARCODES.some(
      b => b.toLowerCase().replace(/[-_]/g, '') === normalized
    );
  },

  /**
   * General validation for any barcode
   */
  isValid: (barcode: string | null | undefined): boolean => {
    if (!barcode) return false;
    return barcode.length > 0;
  },

  /**
   * Validate barcode format for stock verification
   * Expected: 6-digit numeric barcode (per ERP policy)
   */
  isValidStockBarcode: (barcode: string): boolean => {
    const trimmed = barcode.trim();
    // Must be 6 digits
    if (!/^\d{6}$/.test(trimmed)) return false;
    // Must start with valid prefix (51, 52, 53)
    const prefix = trimmed.substring(0, 2);
    return ['51', '52', '53'].includes(prefix);
  },

  /**
   * Normalize barcode value
   */
  normalizeBarcode: (barcode: string): string => {
    // Remove leading zeros, whitespace, and special characters
    return barcode.trim().replace(/^0+/, '').replace(/[^0-9]/g, '');
  },

  /**
   * Extract barcode from scan result
   */
  extractBarcode: (result: BarcodeScanningResult): string => {
    return BarcodeValidator.normalizeBarcode(result.data);
  },
};

/**
 * Scan throttle manager to prevent duplicate scans
 */
export class ScanThrottleManager {
  private lastScanTime: number = 0;
  private lastBarcode: string = '';
  private config = SCANNER_CONFIG.throttle;

  /**
   * Check if scan should be processed
   */
  shouldProcessScan(barcode: string): boolean {
    const now = Date.now();
    const timeSinceLastScan = now - this.lastScanTime;

    // Check minimum time between any scans
    if (timeSinceLastScan < this.config.anyBarcode) {
      return false;
    }

    // Check if same barcode was scanned recently
    if (
      barcode === this.lastBarcode &&
      timeSinceLastScan < this.config.sameBarcode
    ) {
      return false;
    }

    return true;
  }

  /**
   * Record a processed scan
   */
  recordScan(barcode: string): void {
    this.lastScanTime = Date.now();
    this.lastBarcode = barcode;
  }

  /**
   * Reset throttle state
   */
  reset(): void {
    this.lastScanTime = 0;
    this.lastBarcode = '';
  }

  /**
   * Get time until next scan is allowed
   */
  getTimeUntilNextScan(): number {
    const now = Date.now();
    const elapsed = now - this.lastScanTime;
    const remaining = this.config.anyBarcode - elapsed;
    return Math.max(0, remaining);
  }
}

/**
 * Default scanner configuration for export
 */
export default SCANNER_CONFIG;
