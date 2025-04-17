import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import { SolanaProvider } from "./context/SolanaContext";
import { SolanaWalletProvider } from "./components/ui/wallet-adapter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Make sure our Buffer polyfill is properly configured
// We've already defined this in index.html
const ensureBufferPolyfill = () => {
  if (!window.Buffer) {
    console.warn('Setting up Buffer polyfill from main.tsx');
    window.Buffer = {
      from: (data: string | Uint8Array, encoding?: string) => {
        if (typeof data === 'string') {
          return new TextEncoder().encode(data);
        }
        return new Uint8Array(data);
      }
    } as any;
  }
};

// Initialize our polyfill
ensureBufferPolyfill();

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SolanaWalletProvider>
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </SolanaWalletProvider>
  </QueryClientProvider>
);
