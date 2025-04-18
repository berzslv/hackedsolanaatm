// Import buffer polyfill first before anything else to ensure it's available
import { ensureBufferPolyfill as setupBufferPolyfillFirst } from "./lib/buffer-polyfill";
// Import other polyfills
import { initBufferPolyfill, BrowserBuffer } from "./lib/browser-polyfills";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import { SolanaProvider } from "./context/SolanaContext";
import { SolanaWalletProvider } from "./components/ui/wallet-adapter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Make sure our Buffer polyfill is properly configured
// We've already defined this in index.html, but let's make sure it's set up properly
const setupBufferPolyfill = () => {
  if (!window.Buffer) {
    console.warn('Setting up Buffer polyfill from main.tsx');
    // Use our more complete Buffer implementation
    window.Buffer = BrowserBuffer as any;
  }
  
  // Initialize the polyfill explicitly
  initBufferPolyfill();
  
  // Verify the polyfill is working
  try {
    // Use BrowserBuffer directly to avoid any issues with the global Buffer
    const testBuffer = BrowserBuffer.from("test");
    console.log("Buffer polyfill working:", testBuffer.length === 4);
  } catch (e) {
    console.error("Buffer polyfill failed:", e);
  }
};

// Initialize our polyfill
setupBufferPolyfillFirst(); // Call the imported one first
setupBufferPolyfill(); // Then our local implementation

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SolanaWalletProvider>
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </SolanaWalletProvider>
  </QueryClientProvider>
);
