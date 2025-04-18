/**
 * Buffer Polyfill
 * 
 * This module provides a comprehensive Buffer polyfill for browsers
 * that don't have full Buffer implementation or have compatibility issues.
 * It specifically addresses issues with Buffer.alloc in browser environments.
 */

import BN from 'bn.js';

/**
 * Create a buffer-like array with specified size and fill value
 * Direct replacement for Buffer.alloc
 * 
 * @param size Size of the buffer to allocate
 * @param fill Value to fill the buffer with (default: 0)
 * @returns Uint8Array with the allocated size
 */
export function allocBuffer(size: number, fill: number = 0): Uint8Array {
  const buffer = new Uint8Array(size);
  if (fill !== 0) {
    buffer.fill(fill);
  }
  return buffer;
}

/**
 * Create a buffer from an array, string or ArrayBuffer
 * Direct replacement for Buffer.from with common use cases
 * 
 * @param data Data to create buffer from (array, string, ArrayBuffer, etc.)
 * @param encoding Optional encoding for string data
 * @returns Uint8Array containing the data
 */
export function fromBuffer(
  data: number[] | string | ArrayBuffer | Uint8Array,
  encoding?: 'hex' | 'utf8' | 'base64'
): Uint8Array {
  // Handle array of numbers
  if (Array.isArray(data)) {
    return new Uint8Array(data);
  }

  // Handle Uint8Array - just return it
  if (data instanceof Uint8Array) {
    return data;
  }

  // Handle ArrayBuffer
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }

  // Handle string with encoding
  if (typeof data === 'string') {
    if (encoding === 'hex') {
      // Convert hex string to byte array
      const result = new Uint8Array(Math.floor(data.length / 2));
      for (let i = 0; i < result.length; i++) {
        const byteValue = parseInt(data.substring(i * 2, i * 2 + 2), 16);
        result[i] = byteValue;
      }
      return result;
    } else if (encoding === 'base64') {
      // Use browser's built-in base64 decoder
      const binaryString = atob(data);
      const result = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        result[i] = binaryString.charCodeAt(i);
      }
      return result;
    } else {
      // Default to UTF-8 encoding
      const encoder = new TextEncoder();
      return encoder.encode(data);
    }
  }

  // Fallback - try to use built-in Buffer if available
  try {
    // @ts-ignore - this is a runtime check
    if (typeof Buffer !== 'undefined') {
      // @ts-ignore - using Buffer if available
      return new Uint8Array(Buffer.from(data, encoding));
    }
  } catch (e) {
    console.error("Built-in Buffer failed, using polyfill", e);
  }

  // Last resort fallback
  console.warn("Unhandled data type in fromBuffer, returning empty buffer");
  return new Uint8Array(0);
}

/**
 * Convert BN.js big number to byte array
 * Safely converts BN to array with specific length and endianness
 * 
 * @param bn BN.js big number instance
 * @param length Number of bytes
 * @param endian Endianness ('le' or 'be')
 * @returns Array of bytes representing the BN value
 */
export function bnToArray(bn: BN, length: number, endian: 'le' | 'be' = 'le'): number[] {
  // Get the array representation with proper endianness
  const origArray = bn.toArray(endian, length);
  return Array.from(origArray);
}

/**
 * Convert a BN.js big number directly to Uint8Array
 * 
 * @param bn BN.js big number instance
 * @param length Number of bytes
 * @param endian Endianness ('le' or 'be')
 * @returns Uint8Array representation of the BN value
 */
export function bnToUint8Array(bn: BN, length: number, endian: 'le' | 'be' = 'le'): Uint8Array {
  return new Uint8Array(bnToArray(bn, length, endian));
}

/**
 * Concatenate multiple Uint8Arrays
 * 
 * @param arrays Array of Uint8Arrays to concatenate
 * @returns Combined Uint8Array
 */
export function concatArrays(...arrays: Uint8Array[]): Uint8Array {
  // Calculate the combined length
  const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
  
  // Create a new array with the total length
  const result = new Uint8Array(totalLength);
  
  // Copy each array into the result
  let offset = 0;
  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }
  
  return result;
}

/**
 * Write a 32-bit value to a Uint8Array in little-endian format
 * Replacement for Buffer.writeUInt32LE
 * 
 * @param buffer The target Uint8Array
 * @param value The value to write
 * @param offset The offset in the buffer
 * @returns The buffer for chaining
 */
export function writeUint32LE(buffer: Uint8Array, value: number, offset: number = 0): Uint8Array {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >>> 8) & 0xff;
  buffer[offset + 2] = (value >>> 16) & 0xff;
  buffer[offset + 3] = (value >>> 24) & 0xff;
  return buffer;
}

/**
 * Read a 32-bit value from a Uint8Array in little-endian format
 * Replacement for Buffer.readUInt32LE
 * 
 * @param buffer The source Uint8Array
 * @param offset The offset in the buffer
 * @returns The read value
 */
export function readUint32LE(buffer: Uint8Array, offset: number = 0): number {
  return (buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)) >>> 0;
}

/**
 * Run a comprehensive check to see if our buffer polyfill is necessary
 * 
 * @returns True if we need the polyfill, false if native Buffer works fully
 */
export function needsBufferPolyfill(): boolean {
  try {
    // Check if Buffer exists
    if (typeof Buffer === 'undefined') {
      return true;
    }

    // Test Buffer.alloc
    const testAlloc = Buffer.alloc(4);
    if (testAlloc.length !== 4) {
      return true;
    }

    // Test Buffer.writeUInt32LE
    testAlloc.writeUInt32LE(0x12345678, 0);
    if (testAlloc.readUInt32LE(0) !== 0x12345678) {
      return true;
    }

    // All tests passed, we don't need the polyfill
    return false;
  } catch (e) {
    // Any error means we should use the polyfill
    console.log("Buffer polyfill needed due to error:", e);
    return true;
  }
}

// Export a complete API that mimics the Buffer API for easy replacement
export const BufferPolyfill = {
  alloc: allocBuffer,
  from: fromBuffer,
  concat: concatArrays,
  writeUInt32LE: writeUint32LE,
  readUInt32LE: readUint32LE,
  isNeeded: needsBufferPolyfill
};