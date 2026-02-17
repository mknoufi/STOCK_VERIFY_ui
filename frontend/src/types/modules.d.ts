declare module 'expo-local-authentication';

declare module 'expo-secure-store' {
    export interface SecureStoreOptions {
        keychainService?: string;
        keychainAccessible?: number;
    }
    export const AFTER_FIRST_UNLOCK: number;
    export function setItemAsync(key: string, value: string, options?: SecureStoreOptions): Promise<void>;
    export function getItemAsync(key: string, options?: SecureStoreOptions): Promise<string | null>;
    export function deleteItemAsync(key: string, options?: SecureStoreOptions): Promise<void>;
}
