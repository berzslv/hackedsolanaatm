// Import the buffer package (now installed as a dependency)
import { Buffer } from 'buffer';

// Make Buffer available globally so libraries can access it
if (typeof window !== 'undefined') {
  // Set up Buffer in the global namespace
  window.Buffer = Buffer;
  
  // Ensure global is defined
  if (typeof window.global === 'undefined') {
    window.global = window;
  }
  
  // Make sure global.Buffer is set
  window.global.Buffer = Buffer;
}