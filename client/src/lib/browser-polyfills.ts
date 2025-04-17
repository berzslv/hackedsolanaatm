/**
 * Browser Polyfills
 * This file provides browser-compatible implementations of Node.js functionality
 */

// Export a browser-compatible Buffer alternative
export class BrowserBuffer {
  static from(input: string | Uint8Array, encoding?: string): Uint8Array {
    if (typeof input === 'string') {
      // Convert string to Uint8Array
      if (encoding === 'base64') {
        // Handle base64 encoding
        const binaryString = atob(input);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      } else {
        // Default to UTF-8
        return new TextEncoder().encode(input);
      }
    } else {
      // If already a Uint8Array, return as is
      return input;
    }
  }
}

// PublicKey.toBuffer() replacement function
export function publicKeyToBytes(publicKey: any): Uint8Array {
  // Get the bytes directly if available, or convert from base58 string
  if (publicKey._bn) {
    // For Solana PublicKey objects
    const bytes = publicKey.toBytes();
    return bytes;
  } else if (typeof publicKey === 'string') {
    // If it's a string (base58 encoded), decode it
    throw new Error('String public keys need to be converted to PublicKey first');
  } else {
    throw new Error('Unknown public key format');
  }
}