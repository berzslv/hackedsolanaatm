/**
 * Buffer Initialization System
 * 
 * This module ensures that a proper Buffer implementation is available
 * before any part of the application tries to use it.
 * 
 * It detects if the browser's Buffer polyfill is incomplete and
 * applies fixes as needed.
 */

import { needsBufferPolyfill, BufferPolyfill } from './buffer-polyfill';
import { initBufferPolyfill, BrowserBuffer } from './browser-polyfills';

/**
 * Initialize and ensure a working Buffer implementation
 * This function will:
 * 1. Check if Buffer exists
 * 2. Check if it has required methods
 * 3. Apply our polyfill if needed
 * 
 * @returns true if successful, false if unable to provide Buffer functionality
 */
export function ensureBufferImplementation(): boolean {
  try {
    console.log("Buffer initialization starting...");
    
    // First check if the global Buffer exists at all
    const hasBuffer = typeof Buffer !== 'undefined';
    console.log(`Global Buffer exists: ${hasBuffer}`);
    
    if (!hasBuffer) {
      console.warn('No global Buffer found, applying full polyfill');
      if (typeof window !== 'undefined') {
        // Apply our comprehensive polyfill
        window.Buffer = BufferPolyfill as any;
        console.log('Applied comprehensive Buffer polyfill');
      }
      return true;
    }
    
    // Check if our polyfill is needed (tests various Buffer methods)
    const needsPolyfill = needsBufferPolyfill();
    console.log(`Buffer polyfill needed: ${needsPolyfill}`);
    
    if (needsPolyfill) {
      console.warn('Buffer exists but is incomplete, patching methods...');
      
      // Patch only the missing or problematic methods
      if (typeof window !== 'undefined' && window.Buffer) {
        // Check and patch Buffer.alloc
        if (!window.Buffer.alloc || typeof window.Buffer.alloc !== 'function') {
          console.log('Patching Buffer.alloc');
          window.Buffer.alloc = BufferPolyfill.alloc;
        }
        
        // Check and patch other methods as needed
        // Add more patches here if specific methods have issues
      }
      
      console.log('Buffer patching complete');
    }
    
    // Also initialize the legacy polyfill for backward compatibility
    initBufferPolyfill();
    
    // Verify the polyfill is working
    try {
      // Simple test
      const testBuffer = Buffer.from([1, 2, 3, 4]);
      console.log(`Buffer test successful: length=${testBuffer.length}`);
      
      // Test alloc specifically
      try {
        const allocTest = Buffer.alloc(4, 0);
        console.log(`Buffer.alloc test successful: length=${allocTest.length}`);
      } catch (allocError) {
        console.error('Buffer.alloc still failing after patching:', allocError);
        // Apply more aggressive patching - replace the entire Buffer
        if (typeof window !== 'undefined') {
          console.warn('Applying full Buffer replacement');
          window.Buffer = BufferPolyfill as any;
        }
      }
      
    } catch (testError) {
      console.error('Buffer verification failed:', testError);
      return false;
    }
    
    console.log('Buffer implementation successfully initialized');
    return true;
  } catch (error) {
    console.error('Fatal error during Buffer initialization:', error);
    return false;
  }
}

// Execute immediately on import
const bufferInitResult = ensureBufferImplementation();
if (!bufferInitResult) {
  console.error('CRITICAL: Failed to initialize Buffer implementation');
  // Show warning for developers
  if (typeof window !== 'undefined') {
    console.warn(
      '%c⚠️ Buffer Initialization Failed ⚠️\n' + 
      'This will cause problems with cryptocurrency transactions.\n' + 
      'Please check the console for more details.',
      'background: #FFF7B5; color: #B35900; font-size: 14px; font-weight: bold; padding: 5px;'
    );
  }
}

export default bufferInitResult;