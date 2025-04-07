import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWalletContext } from "@/context/WalletContext";

const WALLET_PROVIDERS = [
  {
    name: "Phantom",
    id: "phantom",
    icon: "ri-ghost-line",
    className: "bg-purple-600 hover:bg-purple-700",
  },
  {
    name: "Solflare",
    id: "solflare",
    icon: "ri-sun-line",
    className: "bg-orange-500 hover:bg-orange-600",
  },
  {
    name: "Slope",
    id: "slope",
    icon: "ri-arrow-up-line",
    className: "bg-blue-600 hover:bg-blue-700",
  },
  {
    name: "Coinbase",
    id: "coinbase",
    icon: "ri-coin-line",
    className: "bg-blue-500 hover:bg-blue-600", 
  },
  // For testing purposes
  {
    name: "MetaMask",
    id: "metamask",
    icon: "ri-copper-coin-line",
    className: "bg-amber-500 hover:bg-amber-600",
  },
];

export function WalletModal() {
  const { showWalletModal, setShowWalletModal, connectWallet } = useWalletContext();

  const handleConnect = (providerId: string) => {
    connectWallet(providerId);
  };

  return (
    <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Connect your Solana wallet to access all features of Hacked ATM Token.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {WALLET_PROVIDERS.map((provider) => (
            <Button
              key={provider.id}
              variant="outline"
              className="flex items-center justify-start gap-3 h-14"
              onClick={() => handleConnect(provider.id)}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${provider.className}`}>
                <i className={`${provider.icon} text-lg`}></i>
              </div>
              <span className="font-medium">{provider.name}</span>
            </Button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}