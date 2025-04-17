import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import { SolanaProvider } from "./context/SolanaContext";
import { SolanaWalletProvider } from "./components/ui/wallet-adapter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

// Buffer polyfill for browser compatibility
import { Buffer } from 'buffer';
window.Buffer = Buffer;

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <SolanaWalletProvider>
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </SolanaWalletProvider>
  </QueryClientProvider>
);
