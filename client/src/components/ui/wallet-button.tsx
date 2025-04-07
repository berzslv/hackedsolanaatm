import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/context/WalletContext";
import { shortenAddress } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface WalletButtonProps {
  variant?: "default" | "gradient";
  className?: string;
}

export function WalletButton({ variant = "default", className }: WalletButtonProps) {
  const { connected, publicKey, setShowWalletModal } = useWalletContext();

  const handleClick = () => {
    setShowWalletModal(true);
  };

  if (connected && publicKey) {
    return (
      <Button
        onClick={handleClick}
        className={cn(
          "flex items-center gap-2",
          variant === "gradient" 
            ? "bg-gradient-to-r from-primary to-secondary text-dark-900" 
            : "bg-dark-700 border border-primary/30 text-primary",
          className
        )}
      >
        <i className="ri-wallet-3-line mr-1"></i>
        {shortenAddress(publicKey.toString())}
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "hidden sm:flex items-center gap-2",
        variant === "gradient" 
          ? "bg-gradient-to-r from-primary to-secondary text-dark-900" 
          : "bg-gradient-to-r from-primary to-secondary text-dark-900",
        className
      )}
    >
      Connect Wallet
    </Button>
  );
}
