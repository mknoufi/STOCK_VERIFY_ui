// Main entry point for src
// Note: Be careful with duplicate exports across modules

// Re-export only from store (which has the primary auth state)
export { useAuthStore, AuthState } from './store/authStore';
export { useNetworkStore } from './store/networkStore';
export { useSettingsStore } from './store/settingsStore';

// Re-export commonly used hooks
export { useTheme } from './hooks/useTheme';

// Re-export types - use scan.ts Item as the primary one
export { Item as ScanItem } from './types/scan';
export { Item as ItemType } from './types/item';
export type { ScannerMode, PhotoProofType, ScanFormData, CreateCountLinePayload, PhotoProofDraft, SerialInput, WorkflowState } from './types/scan';
export type { SearchResult } from './types/item';
