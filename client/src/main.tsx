import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import { SolanaProvider } from "./context/SolanaContext";
import { WalletProvider } from "./components/ui/simplified-wallet-adapter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <WalletProvider>
      <SolanaProvider>
        <App />
      </SolanaProvider>
    </WalletProvider>
  </QueryClientProvider>
);
