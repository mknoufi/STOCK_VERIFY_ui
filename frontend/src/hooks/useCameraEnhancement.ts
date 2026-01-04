/**
 * React Hook for Camera Enhancement
 * Provides easy integration of enhanced camera features
 * Phase 0: Enhanced Mobile Camera Features
 */

import { useState, useEffect, useCallback } from "react";
import {
  cameraEnhancementService,
  type CameraSettings,
  type ScanRegion,
} from "@/services/cameraEnhancementService";
import { Dimensions } from "react-native";

interface UseCameraEnhancementReturn {
  settings: CameraSettings;
  scanRegion: ScanRegion;
  torchEnabled: boolean;
  zoom: number;
  toggleTorch: () => Promise<void>;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setZoom: (level: number) => void;
  autoAdjustFlash: () => Promise<void>;
  boostBrightness: () => Promise<void>;
  restoreBrightness: () => Promise<void>;
}

export const useCameraEnhancement = (): UseCameraEnhancementReturn => {
  const [settings, setSettings] = useState<CameraSettings>(
    cameraEnhancementService.getCurrentSettings(),
  );
  const [scanRegion, setScanRegion] = useState<ScanRegion>(() => {
    const { width, height } = Dimensions.get("window");
    return cameraEnhancementService.getScanRegion(width, height);
  });

  useEffect(() => {
    // Initialize service
    const init = async () => {
      await cameraEnhancementService.initialize();
      setSettings(cameraEnhancementService.getCurrentSettings());
    };

    init();

    // Update scan region on dimension changes
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setScanRegion(
        cameraEnhancementService.getScanRegion(window.width, window.height),
      );
    });

    // Cleanup
    return () => {
      subscription?.remove();
      cameraEnhancementService.cleanup();
    };
  }, []);

  const toggleTorch = useCallback(async () => {
    const enabled = await cameraEnhancementService.toggleTorch();
    setSettings((prev) => ({ ...prev, torchEnabled: enabled }));
  }, []);

  const zoomIn = useCallback(() => {
    const newZoom = cameraEnhancementService.zoomIn();
    setSettings((prev) => ({ ...prev, zoom: newZoom }));
  }, []);

  const zoomOut = useCallback(() => {
    const newZoom = cameraEnhancementService.zoomOut();
    setSettings((prev) => ({ ...prev, zoom: newZoom }));
  }, []);

  const resetZoom = useCallback(() => {
    const newZoom = cameraEnhancementService.resetZoom();
    setSettings((prev) => ({ ...prev, zoom: newZoom }));
  }, []);

  const setZoom = useCallback((level: number) => {
    const newZoom = cameraEnhancementService.setZoom(level);
    setSettings((prev) => ({ ...prev, zoom: newZoom }));
  }, []);

  const autoAdjustFlash = useCallback(async () => {
    const flashMode = await cameraEnhancementService.autoAdjustFlash();
    setSettings((prev) => ({ ...prev, flashMode }));
  }, []);

  const boostBrightness = useCallback(async () => {
    await cameraEnhancementService.boostBrightness();
  }, []);

  const restoreBrightness = useCallback(async () => {
    await cameraEnhancementService.restoreBrightness();
  }, []);

  return {
    settings,
    scanRegion,
    torchEnabled: settings.torchEnabled,
    zoom: settings.zoom,
    toggleTorch,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    autoAdjustFlash,
    boostBrightness,
    restoreBrightness,
  };
};
