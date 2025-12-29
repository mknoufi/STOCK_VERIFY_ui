/**
 * UUID Generator Utility
 *
 * Provides UUID v4 generation for unique identifiers.
 * Uses crypto API when available, falls back to Math.random.
 */

/**
 * Generate a UUID v4 string.
 *
 * Uses crypto.getRandomValues when available (more secure),
 * falls back to Math.random for environments without crypto.
 */
export function generateUUID(): string {
  // Try to use crypto API for better randomness
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);

    // Set version (4) and variant (RFC4122)
    // TypeScript knows bytes is 16 elements, but we assert for safety
    const byte6 = bytes[6]!;
    const byte8 = bytes[8]!;
    bytes[6] = (byte6 & 0x0f) | 0x40; // Version 4
    bytes[8] = (byte8 & 0x3f) | 0x80; // Variant

    const hex = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    return [
      hex.slice(0, 8),
      hex.slice(8, 12),
      hex.slice(12, 16),
      hex.slice(16, 20),
      hex.slice(20, 32),
    ].join('-');
  }

  // Fallback using Math.random (less secure but works everywhere)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a short unique ID (8 characters).
 * Useful for simpler identifiers where full UUID is overkill.
 */
export function generateShortId(): string {
  const uuid = generateUUID();
  return uuid.replace(/-/g, '').slice(0, 8);
}

/**
 * Generate an offline-prefixed unique ID.
 * Format: offline_{uuid}
 */
export function generateOfflineId(): string {
  return `offline_${generateUUID()}`;
}
