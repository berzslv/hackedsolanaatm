/**
 * Simple Buffer polyfill that uses Uint8Array under the hood.
 * Created for Solana web3.js compatibility in the browser.
 */

// Only execute in a browser environment where window is defined
if (typeof window !== 'undefined') {
  // Skip if Buffer is already defined
  if (!window.Buffer) {
    // Global browser objects we need access to
    const global = window;
    
    // Create the Buffer constructor
    function Buffer(arg, encodingOrOffset, length) {
      // Common case: Buffer.from(array)
      if (Array.isArray(arg)) {
        return new Uint8Array(arg);
      }
      
      // Buffer.from(string, encoding)
      if (typeof arg === 'string') {
        let encoding = encodingOrOffset || 'utf8';
        
        if (encoding === 'hex') {
          // Convert hex to bytes
          const len = arg.length;
          const bytes = new Uint8Array(Math.floor(len / 2));
          
          for (let i = 0; i < bytes.length; i++) {
            const hexByte = arg.substring(i * 2, i * 2 + 2);
            bytes[i] = parseInt(hexByte, 16);
          }
          
          return bytes;
        } 
        else if (encoding === 'base64') {
          // Convert base64 to bytes
          const binaryString = atob(arg);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          return bytes;
        } 
        else if (encoding === 'utf8' || encoding === 'utf-8') {
          // Convert UTF-8 to bytes
          return new TextEncoder().encode(arg);
        }
      }
      
      // Buffer.alloc(size)
      if (typeof arg === 'number') {
        return new Uint8Array(arg);
      }
      
      // Buffer.from(arrayBuffer)
      if (arg instanceof ArrayBuffer || arg instanceof Uint8Array) {
        return new Uint8Array(arg);
      }
      
      // Default to empty buffer
      return new Uint8Array(0);
    }
    
    // Static methods
    Buffer.from = function(data, encoding) {
      return Buffer(data, encoding);
    };
    
    Buffer.alloc = function(size, fill) {
      const buf = new Uint8Array(size);
      if (fill !== undefined) {
        buf.fill(fill);
      }
      return buf;
    };
    
    Buffer.allocUnsafe = function(size) {
      return new Uint8Array(size);
    };
    
    Buffer.isBuffer = function(obj) {
      return obj instanceof Uint8Array;
    };
    
    Buffer.concat = function(list, length) {
      if (length === undefined) {
        length = list.reduce((acc, val) => acc + val.length, 0);
      }
      
      const result = new Uint8Array(length);
      let offset = 0;
      
      for (let buf of list) {
        result.set(buf, offset);
        offset += buf.length;
      }
      
      return result;
    };
    
    // Define Buffer globally
    global.Buffer = Buffer;
    
    // Ensure process.env exists
    if (!global.process) {
      global.process = { env: {} };
    }
    
    console.log('Buffer polyfill installed');
  }
}