// This file directly imports node polyfills for browser use

// Since we can't modify vite.config.ts directly, we import the polyfills here
// and then import this file in main.tsx

// Import buffer polyfill
export const bufferPolyfill = (() => {
  if (typeof window !== 'undefined') {
    // Create a Buffer-like class that extends Uint8Array
    const BufferClass = function(arg: any, encodingOrOffset?: any, length?: any) {
      if (!(this instanceof BufferClass)) {
        return new (BufferClass as any)(arg, encodingOrOffset, length);
      }
      
      let buffer: Uint8Array;
      
      if (typeof arg === 'number') {
        buffer = new Uint8Array(arg);
      } else if (typeof arg === 'string') {
        const encoding = encodingOrOffset || 'utf8';
        
        if (encoding === 'base64') {
          const binaryString = window.atob(arg);
          buffer = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            buffer[i] = binaryString.charCodeAt(i);
          }
        } else if (encoding === 'hex') {
          buffer = new Uint8Array(Math.floor(arg.length / 2));
          for (let i = 0; i < buffer.length; i++) {
            buffer[i] = parseInt(arg.substring(i * 2, i * 2 + 2), 16);
          }
        } else {
          // Default UTF-8
          buffer = new TextEncoder().encode(arg);
        }
      } else if (arg instanceof Uint8Array || Array.isArray(arg)) {
        buffer = new Uint8Array(arg);
      } else {
        buffer = new Uint8Array(0);
      }
      
      // Copy buffer into this
      const uint8Array = new Uint8Array(buffer);
      for (let i = 0; i < uint8Array.length; i++) {
        (this as any)[i] = uint8Array[i];
      }
      
      Object.setPrototypeOf(this, BufferClass.prototype);
      (this as any).length = uint8Array.length;
      return this;
    };
    
    // Inherit from Uint8Array
    BufferClass.prototype = Object.create(Uint8Array.prototype);
    
    // Add static methods to Buffer
    (BufferClass as any).from = function(arg: any, encodingOrOffset?: any, length?: any) {
      return new (BufferClass as any)(arg, encodingOrOffset, length);
    };
    
    (BufferClass as any).alloc = function(size: number, fill?: number) {
      const buf = new (BufferClass as any)(size);
      if (fill !== undefined) {
        for (let i = 0; i < size; i++) {
          buf[i] = fill;
        }
      }
      return buf;
    };
    
    (BufferClass as any).allocUnsafe = function(size: number) {
      return new (BufferClass as any)(size);
    };
    
    (BufferClass as any).isBuffer = function(obj: any) {
      return obj instanceof BufferClass;
    };
    
    // Add prototype methods
    BufferClass.prototype.toString = function(encoding = 'utf8') {
      const buf = new Uint8Array(this);
      if (encoding === 'hex') {
        return Array.from(buf)
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
      } else if (encoding === 'base64') {
        const binary = Array.from(buf)
          .map(b => String.fromCharCode(b))
          .join('');
        return window.btoa(binary);
      }
      return new TextDecoder().decode(buf);
    };
    
    // Make sure global variables are defined
    window.global = window;
    window.process = window.process || { env: {} };
    
    // Set Buffer globally
    window.Buffer = BufferClass as any;
    (window as any).global.Buffer = BufferClass;
    
    return BufferClass;
  }
  
  return null;
})();

// Setup process.env
if (typeof window !== 'undefined') {
  window.process = window.process || { env: {} };
}