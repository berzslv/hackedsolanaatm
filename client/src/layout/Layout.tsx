// Layout component with navigation with wouter active state support

import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { HomeIcon, FileIcon, LayoutDashboardIcon, CodeIcon } from "lucide-react";

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link to="/">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="font-bold text-white">H</span>
                </div>
                <span className="font-bold text-lg">HATM</span>
              </div>
            </Link>
            <nav className="hidden md:flex gap-1">
              <Link to="/">
                <Button
                  variant={location === "/" ? "secondary" : "ghost"}
                  className="text-sm flex gap-1"
                >
                  <HomeIcon className="h-4 w-4" />
                  Home
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button
                  variant={location === "/dashboard" ? "secondary" : "ghost"}
                  className="text-sm flex gap-1"
                >
                  <LayoutDashboardIcon className="h-4 w-4" />
                  Dashboard
                </Button>
              </Link>
              <Link to="/whitepaper">
                <Button
                  variant={location === "/whitepaper" ? "secondary" : "ghost"}
                  className="text-sm flex gap-1"
                >
                  <FileIcon className="h-4 w-4" />
                  Whitepaper
                </Button>
              </Link>
              <Link to="/smart-contract">
                <Button
                  variant={location === "/smart-contract" ? "secondary" : "ghost"}
                  className="text-sm flex gap-1"
                >
                  <CodeIcon className="h-4 w-4" />
                  Smart Contract
                </Button>
              </Link>
            </nav>
          </div>
          <div>
            <WalletMultiButton className={cn(
              "bg-primary hover:bg-primary/90 text-white rounded",
              "wallet-adapter-button wallet-adapter-button-trigger"
            )} />
          </div>
        </div>
      </header>
      <main className="flex-1 py-4">{children}</main>
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 bg-primary/20 rounded-full flex items-center justify-center">
                  <span className="font-bold text-primary">H</span>
                </div>
                <span className="font-bold">HATM Token</span>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                © {new Date().getFullYear()} Hacked ATM Token. All rights reserved.
              </p>
            </div>
            <div className="flex gap-6">
              <Link to="/">
                <Button variant="link" size="sm" className="text-muted-foreground">
                  Home
                </Button>
              </Link>
              <Link to="/dashboard">
                <Button variant="link" size="sm" className="text-muted-foreground">
                  Dashboard
                </Button>
              </Link>
              <Link to="/whitepaper">
                <Button variant="link" size="sm" className="text-muted-foreground">
                  Whitepaper
                </Button>
              </Link>
              <Link to="/smart-contract">
                <Button variant="link" size="sm" className="text-muted-foreground">
                  Smart Contract
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}