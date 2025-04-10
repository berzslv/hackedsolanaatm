import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import { SolanaProvider } from "./context/SolanaContext";
import { SolanaWalletProvider } from "./components/ui/wallet-adapter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ReferralProvider } from "./context/ReferralContext";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ReferralProvider>
      <SolanaWalletProvider>
        <SolanaProvider>
          <App />
        </SolanaProvider>
      </SolanaWalletProvider>
    </ReferralProvider>
  </QueryClientProvider>
);
