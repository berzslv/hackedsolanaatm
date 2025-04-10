import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSolana } from '../context/SolanaContext';
import { formatNumber } from '@/lib/utils';

interface TokenTransferWidgetProps {
  tokenBalance: number;
}

const TokenTransferWidget: React.FC<TokenTransferWidgetProps> = ({ tokenBalance }) => {
  const { toast } = useToast();
  const { publicKey } = useSolana();
  
  const [recipientAddress, setRecipientAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleTransfer = async () => {
    if (!publicKey) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet first.',
        variant: 'destructive',
      });
      return;
    }
    
    if (!recipientAddress) {
      toast({
        title: 'Recipient required',
        description: 'Please enter a recipient wallet address.',
        variant: 'destructive',
      });
      return;
    }
    
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount greater than 0.',
        variant: 'destructive',
      });
      return;
    }
    
    if (parsedAmount > tokenBalance) {
      toast({
        title: 'Insufficient balance',
        description: `You only have ${formatNumber(tokenBalance)} HATM tokens available.`,
        variant: 'destructive',
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      // Call our API to initiate the transfer
      const response = await fetch('/api/transfer-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          senderWalletAddress: publicKey.toString(),
          recipientWalletAddress: recipientAddress,
          amount: parsedAmount,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        toast({
          title: 'Transfer successful!',
          description: (
            <div className="flex flex-col gap-1">
              <p>{data.message}</p>
              {data.explorerUrl && (
                <a 
                  href={data.explorerUrl} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline text-xs"
                >
                  View transaction on Solana Explorer
                </a>
              )}
            </div>
          ),
          duration: 10000, // 10 seconds so user can click the link
        });
        
        // Clear input fields
        setRecipientAddress('');
        setAmount('');
      } else {
        throw new Error(data.error || "Failed to transfer tokens");
      }
    } catch (error) {
      console.error("Error processing transfer:", error);
      toast({
        title: 'Transfer failed',
        description: error instanceof Error ? error.message : 'Failed to complete the token transfer.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <div className="bg-card/80 backdrop-blur-sm border border-border rounded-lg p-4 shadow-md">
      <h3 className="text-lg font-medium mb-4">Transfer HATM Tokens</h3>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="recipient-address">Recipient Wallet Address</Label>
          <Input
            id="recipient-address"
            placeholder="Enter Solana wallet address"
            value={recipientAddress}
            onChange={(e) => setRecipientAddress(e.target.value)}
            className="bg-background/20"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="transfer-amount">Amount</Label>
            <span className="text-xs text-foreground/70">
              Available: {formatNumber(tokenBalance, { decimals: 2 })} HATM
            </span>
          </div>
          <div className="relative">
            <Input
              id="transfer-amount"
              type="number"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-background/20 pr-16"
            />
            <button
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary hover:text-primary/80"
              onClick={() => setAmount(tokenBalance.toString())}
            >
              MAX
            </button>
          </div>
        </div>
        
        <Button
          className="w-full gradient-button"
          onClick={handleTransfer}
          disabled={isProcessing || !publicKey}
        >
          {isProcessing ? 'Processing...' : 'Transfer Tokens'}
        </Button>
      </div>
    </div>
  );
};

export default TokenTransferWidget;