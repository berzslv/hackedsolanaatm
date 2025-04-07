import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/context/WalletContext";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { shortenAddress } from "@/lib/utils";

const WALLET_ICONS: Record<string, string> = {
  "phantom": "ri-ghost-line",
  "solflare": "ri-sun-line",
  "slope": "ri-arrow-up-line",
  "sollet": "ri-wallet-line",
  "ledger": "ri-hard-drive-line",
  "coinbase": "ri-coin-line",
  "brave": "ri-lion-line",
  "metamask": "ri-copper-coin-line", // Used for testing since we're using a mock wallet
  "trust": "ri-shield-check-line",
};

interface WalletButtonProps {
  className?: string;
  variant?: "default" | "gradient" | "outline";
}

export function WalletButton({ 
  className, 
  variant = "default" 
}: WalletButtonProps) {
  const { connected, publicKey, setShowWalletModal, disconnectWallet } = useWalletContext();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const handleConnect = () => {
    setShowWalletModal(true);
  };

  const handleCopyAddress = () => {
    if (publicKey) {
      navigator.clipboard.writeText(publicKey.toString());
      setIsDropdownOpen(false);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setIsDropdownOpen(false);
  };

  if (connected && publicKey) {
    return (
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="outline"
            className={cn(
              "font-medium gap-2",
              className
            )}
          >
            <i className="ri-wallet-3-line"></i>
            {shortenAddress(publicKey.toString())}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={handleCopyAddress}>
            <i className="ri-file-copy-line mr-2"></i>
            Copy Address
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleDisconnect}>
            <i className="ri-logout-box-line mr-2"></i>
            Disconnect
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      variant={variant === "gradient" ? "default" : variant}
      className={cn(
        variant === "gradient" && "gradient-button",
        "font-medium",
        className
      )}
    >
      <i className="ri-wallet-3-line mr-2"></i>
      Connect Wallet
    </Button>
  );
}