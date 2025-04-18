/**
 * Buffer Polyfill for Browser Environments
 * 
 * This module ensures that the Node.js Buffer API is available in browser environments.
 * It must be imported early in the application to ensure it's available globally.
 */

// Only run this in browser environments
if (typeof window !== 'undefined') {
  // Make sure Buffer is available globally
  window.Buffer = window.Buffer || require('buffer').Buffer;
  
  // Add a debug flag to check if polyfill is working
  console.log('Buffer polyfill working:', typeof Buffer !== 'undefined');
}

// Export a dummy function so this file can be imported
export const ensureBufferPolyfill = () => {
  return typeof Buffer !== 'undefined';
};