/**
 * Browser Polyfills
 * 
 * This file provides browser-compatible implementations of Node.js features
 * that are required for our Solana blockchain interactions.
 * 
 * It ensures that our code can run in both Node.js (server) and browser environments.
 */

// Create a browser compatible Buffer implementation
export class BrowserBuffer {
  static from(data: string | ArrayBuffer | ArrayLike<number>, encoding?: string): Uint8Array {
    if (typeof data === 'string') {
      // Handle string input
      if (encoding === 'hex') {
        // Convert hex string to array
        return hexToUint8Array(data);
      } else {
        // Default to UTF-8 encoding
        return new TextEncoder().encode(data);
      }
    } else if (data instanceof ArrayBuffer) {
      // Handle ArrayBuffer input
      return new Uint8Array(data);
    } else if (ArrayBuffer.isView(data)) {
      // Handle TypedArray or DataView
      return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    } else if (Array.isArray(data)) {
      // Handle array of numbers
      return Uint8Array.from(data);
    }
    
    // Default fallback
    return new Uint8Array();
  }
  
  // Add additional Buffer methods as needed
  static alloc(size: number): Uint8Array {
    return new Uint8Array(size);
  }
  
  static concat(list: Uint8Array[], totalLength?: number): Uint8Array {
    if (totalLength === undefined) {
      totalLength = list.reduce((acc, val) => acc + val.length, 0);
    }
    
    const result = new Uint8Array(totalLength);
    let offset = 0;
    
    for (const arr of list) {
      result.set(arr, offset);
      offset += arr.length;
    }
    
    return result;
  }
}

/**
 * Convert a hex string to Uint8Array
 */
function hexToUint8Array(hexString: string): Uint8Array {
  // Remove 0x prefix if present
  if (hexString.startsWith('0x')) {
    hexString = hexString.slice(2);
  }
  
  // Ensure even length
  if (hexString.length % 2 !== 0) {
    hexString = '0' + hexString;
  }
  
  const arrayBuffer = new Uint8Array(hexString.length / 2);
  
  for (let i = 0; i < hexString.length; i += 2) {
    const byteValue = parseInt(hexString.substr(i, 2), 16);
    arrayBuffer[i / 2] = byteValue;
  }
  
  return arrayBuffer;
}

/**
 * Convert a Uint8Array to hex string
 */
export function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Initialize the global Buffer polyfill
 * Call this before any Solana Web3.js code runs
 */
export function initBufferPolyfill(): void {
  try {
    // Check if window is defined (browser environment)
    if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
      // @ts-ignore - Intentionally overriding window.Buffer
      window.Buffer = BrowserBuffer;
      console.log('Browser Buffer polyfill initialized');
    }
  } catch (error) {
    console.error('Failed to initialize Buffer polyfill:', error);
  }
}

/**
 * Provide a browser-compatible version of node's crypto.randomBytes
 */
export function randomBytes(size: number): Uint8Array {
  // Use the Web Crypto API
  const array = new Uint8Array(size);
  
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(array);
  } else if (typeof crypto !== 'undefined') {
    crypto.getRandomValues(array);
  } else {
    throw new Error('No secure random number generator available');
  }
  
  return array;
}