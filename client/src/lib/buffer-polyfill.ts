/**
 * Buffer Polyfill
 * 
 * Simplified implementation that doesn't rely on Buffer for large integer handling
 */

import { BrowserBuffer } from './browser-polyfills';

// Create a buffer-like class that uses Uint8Array instead
export class BufferPolyfill extends Uint8Array {
  static from(data: any): BufferPolyfill {
    return BrowserBuffer.from(data) as any;
  }
  
  static alloc(size: number, fill: number = 0): BufferPolyfill {
    return BrowserBuffer.alloc(size, fill) as any;
  }
}

/**
 * Check if we need a Buffer polyfill in this environment
 */
export function needsBufferPolyfill(): boolean {
  if (typeof window === 'undefined') {
    // Node.js environment, Buffer should work
    return false;
  }
  
  // Check if global Buffer exists with required methods
  if (typeof window.Buffer === 'undefined') {
    return true;
  }
  
  // Check if Buffer.alloc exists
  if (typeof window.Buffer.alloc !== 'function') {
    return true;
  }
  
  return false;
}

/**
 * Converts a BN object to a Uint8Array for browser compatibility
 * @param bn The BN object
 * @returns A Uint8Array representation
 */
export function bnToUint8Array(bn: any): Uint8Array {
  // Convert BN to a hex string
  const hexStr = bn.toString(16);
  
  // Ensure even length
  const paddedHex = hexStr.length % 2 ? '0' + hexStr : hexStr;
  
  // Convert hex to byte array
  const bytes = new Uint8Array(paddedHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    const byteIndex = i * 2;
    const byte = parseInt(paddedHex.slice(byteIndex, byteIndex + 2), 16);
    bytes[i] = byte;
  }
  
  return bytes;
}

/**
 * Converts a BN object to a regular array
 */
export function bnToArray(bn: any): number[] {
  const bytes = bnToUint8Array(bn);
  return Array.from(bytes);
}