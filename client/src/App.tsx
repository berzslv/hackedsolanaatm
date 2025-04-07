import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TokenDataProvider } from "@/context/TokenDataContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SolanaProvider } from "@/context/SolanaContext";
import { ReferralProvider } from "@/context/ReferralContext";
import NotFound from "@/pages/not-found";
import Layout from "@/layout/Layout";
import Home from "@/pages/Home";
import Whitepaper from "@/pages/Whitepaper";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/whitepaper" component={Whitepaper} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <SolanaProvider>
          <TokenDataProvider>
            <ReferralProvider>
              <Layout>
                <Router />
              </Layout>
              <Toaster />
            </ReferralProvider>
          </TokenDataProvider>
        </SolanaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
