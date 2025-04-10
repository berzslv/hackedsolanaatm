import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "remixicon/fonts/remixicon.css";
import { SolanaProvider } from "./context/SolanaContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { ReferralProvider } from "./context/ReferralContext";
import { ReferralAwareSolanaProvider } from "./components/ui/solana-wallet-provider";

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <ReferralProvider>
      <ReferralAwareSolanaProvider>
        <SolanaProvider>
          <App />
        </SolanaProvider>
      </ReferralAwareSolanaProvider>
    </ReferralProvider>
  </QueryClientProvider>
);
