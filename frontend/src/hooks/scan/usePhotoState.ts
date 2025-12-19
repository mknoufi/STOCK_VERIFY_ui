/**
 * usePhotoState Hook
 * Manages photo proof capture state
 */
import { useState, useCallback } from "react";
import { PhotoProofType, PhotoProofDraft } from "@/types/scan";

interface PhotoState {
  photoProofs: PhotoProofDraft[];
  selectedPhotoType: PhotoProofType;
  showPhotoCapture: boolean;
  photoCameraType: "back" | "front";
  photoCaptureLoading: boolean;
}

const initialState: PhotoState = {
  photoProofs: [],
  selectedPhotoType: "ITEM",
  showPhotoCapture: false,
  photoCameraType: "back",
  photoCaptureLoading: false,
};

export const usePhotoState = () => {
  const [photoState, setPhotoState] = useState<PhotoState>(initialState);

  const updatePhotoState = useCallback((updates: Partial<PhotoState>) => {
    setPhotoState((prev) => ({ ...prev, ...updates }));
  }, []);

  const addPhoto = useCallback((photo: PhotoProofDraft) => {
    setPhotoState((prev) => ({
      ...prev,
      photoProofs: [...prev.photoProofs, photo],
    }));
  }, []);

  const removePhoto = useCallback((photoId: string) => {
    setPhotoState((prev) => ({
      ...prev,
      photoProofs: prev.photoProofs.filter((photo) => photo.id !== photoId),
    }));
  }, []);

  const resetPhotoState = useCallback(() => {
    setPhotoState(initialState);
  }, []);

  return {
    photoState,
    updatePhotoState,
    addPhoto,
    removePhoto,
    resetPhotoState,
  };
};
