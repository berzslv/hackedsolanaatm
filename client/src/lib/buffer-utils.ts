/**
 * Utility functions to replace Buffer usage in browser environment
 */

/**
 * Convert a base64 string to a Uint8Array
 * This is a browser-safe implementation that doesn't rely on Buffer
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = window.atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert a string to a Uint8Array using TextEncoder
 * This is a browser-safe alternative to Buffer.from(str)
 */
export function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

/**
 * Convert a Uint8Array to a string using TextDecoder
 * This is a browser-safe alternative to buffer.toString()
 */
export function uint8ArrayToString(arr: Uint8Array): string {
  return new TextDecoder().decode(arr);
}