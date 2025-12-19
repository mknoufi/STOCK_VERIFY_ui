/**
 * Camera Enhancement Service
 * Provides advanced camera features for barcode scanning
 * Phase 0: Enhanced Mobile Camera Features
 */

import { Camera } from "expo-camera";
import * as Brightness from "expo-brightness";

export interface CameraSettings {
  autoFocus: boolean;
  flashMode: "on" | "off" | "auto";
  zoom: number; // 0-1
  torchEnabled: boolean;
  quality: number; // 0-1
}

export interface ScanRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

class CameraEnhancementService {
  private currentSettings: CameraSettings = {
    autoFocus: true,
    flashMode: "auto",
    zoom: 0,
    torchEnabled: false,
    quality: 0.8,
  };

  private originalBrightness: number = 0.5;

  /**
   * Initialize camera enhancement features
   */
  async initialize(): Promise<void> {
    try {
      // Store original brightness
      this.originalBrightness = await Brightness.getBrightnessAsync();
    } catch (error) {
      console.warn("Failed to get brightness:", error);
    }
  }

  /**
   * Auto-adjust flash based on ambient light
   */
  async autoAdjustFlash(): Promise<"on" | "off"> {
    try {
      const brightness = await Brightness.getBrightnessAsync();

      // If screen brightness is low, likely in dark environment
      if (brightness < 0.3) {
        return "on";
      }

      return "off";
    } catch (error) {
      console.warn("Failed to auto-adjust flash:", error);
      return "off";
    }
  }

  /**
   * Toggle torch/flashlight
   */
  async toggleTorch(): Promise<boolean> {
    this.currentSettings.torchEnabled = !this.currentSettings.torchEnabled;
    return this.currentSettings.torchEnabled;
  }

  /**
   * Set zoom level
   */
  setZoom(level: number): number {
    // Clamp between 0 and 1
    this.currentSettings.zoom = Math.max(0, Math.min(1, level));
    return this.currentSettings.zoom;
  }

  /**
   * Increase zoom
   */
  zoomIn(step: number = 0.1): number {
    return this.setZoom(this.currentSettings.zoom + step);
  }

  /**
   * Decrease zoom
   */
  zoomOut(step: number = 0.1): number {
    return this.setZoom(this.currentSettings.zoom - step);
  }

  /**
   * Reset zoom to default
   */
  resetZoom(): number {
    return this.setZoom(0);
  }

  /**
   * Get optimal scan region (center of screen with guides)
   */
  getScanRegion(screenWidth: number, screenHeight: number): ScanRegion {
    const regionWidth = screenWidth * 0.7;
    const regionHeight = screenHeight * 0.3;

    return {
      x: (screenWidth - regionWidth) / 2,
      y: (screenHeight - regionHeight) / 2,
      width: regionWidth,
      height: regionHeight,
    };
  }

  /**
   * Optimize camera settings for barcode scanning
   */
  getOptimalSettings(): CameraSettings {
    return {
      ...this.currentSettings,
      autoFocus: true,
      quality: 0.8, // Balance between quality and performance
    };
  }

  /**
   * Increase screen brightness temporarily for better scanning
   */
  async boostBrightness(): Promise<void> {
    try {
      await Brightness.setBrightnessAsync(1.0);
    } catch (error) {
      console.warn("Failed to boost brightness:", error);
    }
  }

  /**
   * Restore original brightness
   */
  async restoreBrightness(): Promise<void> {
    try {
      await Brightness.setBrightnessAsync(this.originalBrightness);
    } catch (error) {
      console.warn("Failed to restore brightness:", error);
    }
  }

  /**
   * Get current settings
   */
  getCurrentSettings(): CameraSettings {
    return { ...this.currentSettings };
  }

  /**
   * Update settings
   */
  updateSettings(settings: Partial<CameraSettings>): CameraSettings {
    this.currentSettings = {
      ...this.currentSettings,
      ...settings,
    };
    return this.currentSettings;
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.restoreBrightness();
  }
}

// Singleton instance
export const cameraEnhancementService = new CameraEnhancementService();

export default cameraEnhancementService;
