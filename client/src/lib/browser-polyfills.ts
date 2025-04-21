/**
 * Browser Polyfills
 * 
 * This module provides simpler polyfills for browser environments
 * without using the problematic Buffer implementations.
 */

/**
 * Simple Buffer-like class implementation that uses Uint8Array
 * This is a minimal implementation sufficient for basic operations
 */
export class BrowserBuffer extends Uint8Array {
  static from(data: any): BrowserBuffer {
    // If it's already a Uint8Array, just return a new view
    if (data instanceof Uint8Array) {
      return new BrowserBuffer(data);
    }
    
    // Handle array of numbers
    if (Array.isArray(data)) {
      return new BrowserBuffer(data);
    }
    
    // Handle string
    if (typeof data === 'string') {
      // Very simple ASCII encoding
      const buf = new BrowserBuffer(data.length);
      for (let i = 0; i < data.length; i++) {
        buf[i] = data.charCodeAt(i);
      }
      return buf;
    }
    
    // Default fallback
    return new BrowserBuffer(0);
  }
  
  static alloc(size: number, fill: number = 0): BrowserBuffer {
    const buf = new BrowserBuffer(size);
    buf.fill(fill);
    return buf;
  }
  
  toString(encoding?: string): string {
    // Simple ASCII decoding
    let result = '';
    for (let i = 0; i < this.length; i++) {
      result += String.fromCharCode(this[i]);
    }
    return result;
  }
}

/**
 * Initialize minimal Buffer polyfill for environments that need it
 */
export function initBufferPolyfill() {
  if (typeof window !== 'undefined' && !window.Buffer) {
    window.Buffer = BrowserBuffer as any;
    console.log('Minimal browser Buffer polyfill initialized');
  }
}