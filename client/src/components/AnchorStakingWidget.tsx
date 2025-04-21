import { useState, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { PublicKey } from '@solana/web3.js';
import { ToastAction } from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { executeStakingTransaction } from '@/lib/CreateStakingTransactionV3';
import { createAnchorWallet, AnchorWallet } from '@/lib/anchor-types';
import { useSolana } from '@/hooks/use-solana';

interface AnchorStakingWidgetProps {
  tokenBalance: number;
  stakingInfo: any;
  onSuccess?: () => void;
}

export default function AnchorStakingWidget({ 
  tokenBalance, 
  stakingInfo, 
  onSuccess 
}: AnchorStakingWidgetProps) {
  const { publicKey, connected, wallet, signTransaction, sendTransaction } = useWallet();
  const [amount, setAmount] = useState<string>('');
  const [isStaking, setIsStaking] = useState<boolean>(false);
  const [stakeError, setStakeError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const { toast } = useToast();

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numeric input with up to 9 decimal places
    const value = e.target.value;
    if (/^\d*\.?\d{0,9}$/.test(value) || value === '') {
      setAmount(value);
      // Clear any previous error when user starts typing
      if (stakeError) setStakeError(null);
    }
  };

  const setMaxAmount = () => {
    if (tokenBalance > 0) {
      setAmount(tokenBalance.toString());
    }
  };

  const handleStake = useCallback(async () => {
    if (!publicKey || !connected || !wallet) {
      setStakeError('Please connect your wallet first');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setStakeError('Please enter a valid amount to stake');
      return;
    }

    const amountToStake = parseFloat(amount);
    
    if (amountToStake > tokenBalance) {
      setStakeError(`Insufficient balance. You have ${tokenBalance.toLocaleString()} tokens available.`);
      return;
    }

    setIsStaking(true);
    setStakeError(null);
    setSuccess(false);
    setTxSignature(null);

    try {
      console.log(`🚀 Starting staking process with Anchor V3`);
      console.log(`👛 Wallet public key: ${publicKey.toString()}`);
      console.log(`🔢 Amount to stake: ${amountToStake}`);
      
      // Create wallet adapter compatible with Anchor using our helper
      const anchorWallet = createAnchorWallet(
        publicKey,
        // Make sure we handle potential undefined signTransaction (though it should never be undefined when connected)
        (tx) => signTransaction ? signTransaction(tx) : Promise.reject(new Error("No signTransaction available")),
        // Pass along the sendTransaction function
        sendTransaction,
        // Handle signAllTransactions with proper error handling
        async (txs) => signTransaction ? Promise.all(txs.map(tx => signTransaction(tx))) : Promise.reject(new Error("No signTransaction available"))
      );
      
      // Call the new Anchor-based staking function
      const stakeResult = await executeStakingTransaction(
        publicKey.toString(),
        amountToStake,
        anchorWallet
      );
      
      if (stakeResult.error) {
        console.error('❌ Error from staking transaction:', stakeResult.error);
        throw new Error(stakeResult.error);
      }
      
      if (stakeResult.signature) {
        console.log('✅ Staking transaction successful with signature:', stakeResult.signature);
        setTxSignature(stakeResult.signature);
        setSuccess(true);
        
        toast({
          title: "Tokens staked successfully!",
          description: `You have staked ${amountToStake} tokens.`,
          action: (
            <ToastAction altText="View on Solana Explorer" onClick={() => {
              window.open(`https://explorer.solana.com/tx/${stakeResult.signature}?cluster=devnet`, '_blank');
            }}>
              View Transaction
            </ToastAction>
          ),
        });
        
        // Clear form
        setAmount('');
        
        // Trigger parent callback to refresh data
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      console.error('Staking error:', error);
      setStakeError(error instanceof Error ? error.message : 'Unknown error during staking process');
      
      toast({
        variant: "destructive",
        title: "Staking failed",
        description: error instanceof Error ? error.message : 'Unknown error during staking process',
      });
    } finally {
      setIsStaking(false);
    }
  }, [publicKey, connected, wallet, amount, tokenBalance, signTransaction, sendTransaction, onSuccess, toast]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl font-bold">Stake Tokens</CardTitle>
        <CardDescription>Stake your HATM tokens to earn rewards</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stakeError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{stakeError}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert variant="default" className="bg-green-50 border-green-300">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success!</AlertTitle>
            <AlertDescription className="text-green-700">
              Your tokens have been staked successfully. 
              {txSignature && (
                <a 
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:underline ml-1"
                >
                  View on Explorer
                </a>
              )}
            </AlertDescription>
          </Alert>
        )}
        
        <div className="space-y-2">
          <div className="flex justify-between">
            <Label htmlFor="amount">Amount to stake</Label>
            <span className="text-sm text-muted-foreground">
              Balance: {tokenBalance.toLocaleString()} HATM {' '}
              <button 
                onClick={setMaxAmount} 
                className="text-primary hover:underline"
                type="button"
              >
                Max
              </button>
            </span>
          </div>
          <Input
            id="amount"
            type="text"
            placeholder="Enter amount"
            value={amount}
            onChange={handleAmountChange}
            disabled={isStaking}
          />
        </div>
        
        <div className="space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Lockup period:</span>
            <span>7 days</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Annual percentage yield:</span>
            <span>{stakingInfo?.estimatedAPY || 12}%</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>Early withdrawal fee:</span>
            <span>25%</span>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleStake} 
          disabled={!connected || isStaking || !amount || parseFloat(amount) <= 0}
        >
          {isStaking ? 'Staking...' : 'Stake Tokens'}
        </Button>
      </CardFooter>
    </Card>
  );
}