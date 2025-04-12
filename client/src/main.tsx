// Polyfill for Buffer in the browser
// Define Buffer directly before any other imports
// This must be at the very beginning of the entry point file

// Create a Buffer class directly
class BufferPolyfill extends Uint8Array {
  constructor(arg: any, encodingOrOffset?: string | number, length?: number) {
    if (typeof arg === 'number') {
      super(arg);
    } else if (typeof arg === 'string') {
      const encoding = typeof encodingOrOffset === 'string' ? encodingOrOffset : 'utf8';
      if (encoding === 'base64') {
        const binary = window.atob(arg);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        super(bytes);
      } else if (encoding === 'hex') {
        const bytes = new Uint8Array(Math.floor(arg.length / 2));
        for (let i = 0; i < bytes.length; i++) {
          bytes[i] = parseInt(arg.substring(i * 2, i * 2 + 2), 16);
        }
        super(bytes);
      } else {
        // Default to UTF-8
        super(new TextEncoder().encode(arg));
      }
    } else if (arg instanceof Uint8Array || Array.isArray(arg)) {
      super(arg);
    } else {
      // Handle other cases or use empty buffer as fallback
      super(0);
    }
  }

  static from(data: any, encodingOrOffset?: string | number, length?: number): BufferPolyfill {
    return new BufferPolyfill(data, encodingOrOffset as any, length);
  }

  static alloc(size: number, fill?: number): BufferPolyfill {
    const buffer = new BufferPolyfill(size);
    if (fill !== undefined) {
      buffer.fill(fill);
    }
    return buffer;
  }

  static allocUnsafe(size: number): BufferPolyfill {
    return new BufferPolyfill(size);
  }

  static isBuffer(obj: any): boolean {
    return obj instanceof BufferPolyfill;
  }

  static byteLength(string: string, encoding = 'utf8'): number {
    if (encoding === 'hex') {
      return string.length / 2;
    } else if (encoding === 'base64') {
      const base64Length = string.length;
      // Base64 length * 3/4 gives the approximate byte length
      return Math.floor(base64Length * 0.75);
    }
    // Default UTF-8
    return new TextEncoder().encode(string).length;
  }

  static concat(list: Uint8Array[], totalLength?: number): BufferPolyfill {
    if (totalLength === undefined) {
      totalLength = list.reduce((acc, buf) => acc + buf.length, 0);
    }
    
    const result = new BufferPolyfill(totalLength);
    let offset = 0;
    
    for (const buf of list) {
      result.set(buf, offset);
      offset += buf.length;
    }
    
    return result;
  }

  fill(value: number, start = 0, end = this.length): this {
    for (let i = start; i < end; i++) {
      this[i] = value;
    }
    return this;
  }

  slice(start = 0, end = this.length): BufferPolyfill {
    return new BufferPolyfill(super.slice(start, end));
  }

  readUInt32LE(offset = 0): number {
    return (
      this[offset] |
      (this[offset + 1] << 8) |
      (this[offset + 2] << 16) |
      (this[offset + 3] << 24)
    );
  }

  readUInt32BE(offset = 0): number {
    return (
      (this[offset] << 24) |
      (this[offset + 1] << 16) |
      (this[offset + 2] << 8) |
      this[offset + 3]
    );
  }

  writeUInt32BE(value: number, offset = 0): number {
    this[offset] = (value >>> 24) & 0xff;
    this[offset + 1] = (value >>> 16) & 0xff;
    this[offset + 2] = (value >>> 8) & 0xff;
    this[offset + 3] = value & 0xff;
    return offset + 4;
  }

  writeUInt32LE(value: number, offset = 0): number {
    this[offset] = value & 0xff;
    this[offset + 1] = (value >>> 8) & 0xff;
    this[offset + 2] = (value >>> 16) & 0xff;
    this[offset + 3] = (value >>> 24) & 0xff;
    return offset + 4;
  }

  toString(encoding = 'utf8'): string {
    if (encoding === 'hex') {
      return Array.from(this)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } else if (encoding === 'base64') {
      const binary = Array.from(this)
        .map(b => String.fromCharCode(b))
        .join('');
      return window.btoa(binary);
    }
    // Default to UTF-8
    return new TextDecoder().decode(this);
  }
}

// Set up global Buffer
window.Buffer = BufferPolyfill as any;
(window as any).global = window;
(window as any).global.Buffer = BufferPolyfill;

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import { SolanaProvider } from "./context/SolanaContext";
import { SolanaWalletProvider } from "./components/ui/wallet-adapter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SolanaWalletProvider>
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </SolanaWalletProvider>
  </QueryClientProvider>
);
