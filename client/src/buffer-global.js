// Pure JavaScript file - no TypeScript
// This file sets up global variables needed by Solana web3.js

// Define global process
if (typeof window !== 'undefined' && typeof window.process === 'undefined') {
  window.process = { env: {} };
}

// Define global if not exists
if (typeof window !== 'undefined' && typeof window.global === 'undefined') {
  window.global = window;
}

// Minimal Buffer polyfill (does not override existing Buffer)
if (typeof window !== 'undefined' && typeof window.Buffer === 'undefined') {
  // Primitive Buffer polyfill that just returns Uint8Arrays
  window.Buffer = {
    from: function(data, encoding) {
      // String data with encoding
      if (typeof data === 'string') {
        if (encoding === 'base64') {
          try {
            const binary = window.atob(data);
            const bytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
            }
            return bytes;
          } catch (e) {
            console.error('Base64 decode error:', e);
            return new Uint8Array(0);
          }
        } else if (encoding === 'hex') {
          try {
            const bytes = new Uint8Array(Math.floor(data.length / 2));
            for (let i = 0; i < bytes.length; i++) {
              bytes[i] = parseInt(data.substring(i * 2, i * 2 + 2), 16);
            }
            return bytes;
          } catch (e) {
            console.error('Hex decode error:', e);
            return new Uint8Array(0);
          }
        } else {
          // Default is utf8
          return new TextEncoder().encode(data);
        }
      }
      // Array-like data
      else if (Array.isArray(data) || data instanceof Uint8Array) {
        return new Uint8Array(data);
      }
      return new Uint8Array(0);
    },
    
    alloc: function(size) {
      return new Uint8Array(size);
    }
  };
}