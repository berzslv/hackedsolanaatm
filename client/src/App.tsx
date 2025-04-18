import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TokenDataProvider } from "@/context/TokenDataContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SolanaProvider } from "@/context/SolanaContext";
import { ReferralProvider } from "@/context/ReferralContext";
import NotFound from "@/pages/not-found";
import Header from "@/layout/Header";
import Footer from "@/layout/Footer";
import Home from "@/pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
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
              <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-1">
                  <Router />
                </main>
                <Footer />
              </div>
              <Toaster />
            </ReferralProvider>
          </TokenDataProvider>
        </SolanaProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
