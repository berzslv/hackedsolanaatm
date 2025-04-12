/**
 * Buffer Polyfill for Browser Environment
 * This file provides Buffer implementation for browser compatibility.
 * 
 * We're using a direct approach since we can't modify vite.config.ts
 */

import { Buffer } from 'buffer';

// Make sure global is defined
if (typeof window !== 'undefined') {
  window.global = window;
  window.process = window.process || { env: {} };
  
  // Set up Buffer globally
  window.Buffer = window.Buffer || Buffer;
  window.global.Buffer = window.global.Buffer || Buffer;
}