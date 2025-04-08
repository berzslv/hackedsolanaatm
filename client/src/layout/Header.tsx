import { WalletButton } from "@/components/ui/wallet-button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Link } from "wouter";
import { WhitepaperDialog } from "@/components/WhitepaperDialog";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex gap-6 md:gap-10">
          <Link to="/" className="flex items-center space-x-2">
            <span className="font-bold">Hacked ATM</span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <WhitepaperDialog />
          <WalletButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}