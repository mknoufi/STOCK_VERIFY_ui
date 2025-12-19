/**
 * React Hook for AI-Powered Barcode Recognition
 * Provides easy integration of AI barcode scanning in components
 */

import { useState, useEffect, useCallback } from "react";
import {
  aiBarcodeService,
  BarcodeRecognitionOptions,
  BarcodeResult,
} from "@/services/aiBarcodeRecognition";

interface UseAIBarcodeReturn {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  recognizeBarcode: (
    imageUri: string,
    options?: BarcodeRecognitionOptions,
  ) => Promise<BarcodeResult | null>;
  enhanceImage: (imageUri: string) => Promise<string>;
  isAvailable: boolean;
}

export const useAIBarcode = (): UseAIBarcodeReturn => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        await aiBarcodeService.initialize();
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        console.warn("AI Barcode service initialization failed:", err);
        setError(err instanceof Error ? err.message : "Initialization failed");
      }
    };

    init();

    return () => {
      aiBarcodeService.dispose();
    };
  }, []);

  const recognizeBarcode = useCallback(
    async (
      imageUri: string,
      options?: BarcodeRecognitionOptions,
    ): Promise<BarcodeResult | null> => {
      if (!isInitialized) {
        setError("Service not initialized");
        return null;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await aiBarcodeService.recognizeBarcode(
          imageUri,
          options,
        );
        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Recognition failed";
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isInitialized],
  );

  const enhanceImage = useCallback(
    async (imageUri: string): Promise<string> => {
      if (!isInitialized) {
        return imageUri;
      }

      try {
        return await aiBarcodeService.enhanceImage(imageUri);
      } catch (err) {
        console.warn("Image enhancement failed:", err);
        return imageUri;
      }
    },
    [isInitialized],
  );

  return {
    isInitialized,
    isLoading,
    error,
    recognizeBarcode,
    enhanceImage,
    isAvailable: aiBarcodeService.isAvailable(),
  };
};
