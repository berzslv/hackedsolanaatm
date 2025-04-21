import React, { useState } from 'react';
import { useSolana } from '@/hooks/use-solana';
import { useDirectSolana } from '@/hooks/use-direct-solana';
import { toast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, Clock, Coins, Award, RefreshCcw, Info, Loader2 } from 'lucide-react';
import { GradientText } from '@/components/ui/gradient-text';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { formatNumber, formatTimeRemaining } from '@/lib/utils';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { stakeExistingTokens } from '@/lib/combined-smart-contract-client';
import { checkAndCreateTokenAccount } from '@/lib/api-client';
import { executeStakingTransaction } from '@/lib/CreateStakingTransactionV3';

// Helius API key - optional, would be set from environment in production
const HELIUS_API_KEY = '';

/**
 * SimpleStakingWidget - A simplified version of the staking widget using our V3 transaction handler
 * for better Anchor compatibility and transaction handling.
 */
const SimpleStakingWidget: React.FC = () => {
  // Get wallet connection status
  const { connected, publicKey, signTransaction, sendTransaction, balance } = useSolana();
  
  // Get direct blockchain staking data
  const { stakingInfo, stakingStats, loading, error, refreshAllData } = useDirectSolana(HELIUS_API_KEY);
  
  // Local state for input values
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [unstakeAmount, setUnstakeAmount] = useState<string>('');
  const [isStaking, setIsStaking] = useState<boolean>(false);
  const [isUnstaking, setIsUnstaking] = useState<boolean>(false);
  const [isClaiming, setIsClaiming] = useState<boolean>(false);
  
  // Function to handle staking with our V3 transaction handler
  const handleStake = async () => {
    if (!connected || !publicKey || !signTransaction) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to stake tokens',
        variant: 'destructive'
      });
      return;
    }
    
    if (!stakeAmount || isNaN(Number(stakeAmount)) || Number(stakeAmount) <= 0) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a valid amount to stake',
        variant: 'destructive'
      });
      return;
    }
    
    const amount = Number(stakeAmount);
    
    setIsStaking(true);
    
    try {
      // Set up connection to Solana 
      const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
      
      console.log("🚀 Starting staking process with Anchor client");
      console.log("👛 Wallet public key:", publicKey.toString());
      console.log("🔢 Amount to stake:", amount);
      
      toast({
        title: 'Processing Stake Request',
        description: 'Preparing Anchor transaction...',
      });
      
      // Create a wallet object to pass to stakeExistingTokens that's compatible with Anchor
      const wallet = { 
        publicKey,
        signTransaction
      };
      
      // First check if the user has a token account for HATM token
      console.log("🔧 Checking for token account and creating if needed");
      const tokenMint = "59TF7G5NqMdqjHvpsBPojuhvksHiHVUkaNkaiVvozDrk"; // HATM token mint
      
      toast({
        title: 'Checking token account',
        description: 'Making sure your wallet can hold HATM tokens...',
      });
      
      const tokenAccountResult = await checkAndCreateTokenAccount(
        publicKey.toString(),
        tokenMint,
        wallet
      );
      
      if (!tokenAccountResult.success) {
        console.error("❌ Failed to check/create token account:", tokenAccountResult.error);
        throw new Error(`Failed to prepare token account: ${tokenAccountResult.error || 'Unknown error'}`);
      }
      
      if (tokenAccountResult.exists === false) {
        // Token account was newly created
        toast({
          title: 'Token account created',
          description: 'Your wallet is now ready to hold HATM tokens',
        });
      }
      
      // Check token balance
      try {
        const { Connection, PublicKey, clusterApiUrl } = await import('@solana/web3.js');
        const { TOKEN_PROGRAM_ID } = await import('@solana/spl-token');
        const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
        
        // Get all token accounts for this owner
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint: new PublicKey(tokenMint) }
        );
        
        console.log(`Found ${tokenAccounts.value.length} token accounts for mint`);
        
        let sufficientBalance = false;
        
        if (tokenAccounts.value.length > 0) {
          // Find token account with a balance
          for (const account of tokenAccounts.value) {
            const tokenBalance = account.account.data.parsed.info.tokenAmount.uiAmount;
            console.log(`Token account ${account.pubkey.toString()} has balance: ${tokenBalance}`);
            
            if (tokenBalance >= amount) {
              sufficientBalance = true;
              break;
            }
          }
        }
        
        if (!sufficientBalance) {
          console.error(`❌ No token account has sufficient balance. Required: ${amount} HATM`);
          toast({
            title: 'Insufficient token balance',
            description: `You need ${amount} HATM tokens to stake, but your wallet doesn't have enough. Please buy tokens first.`,
            variant: 'destructive'
          });
          throw new Error(`Insufficient token balance. Required: ${amount} HATM`);
        }
      } catch (balanceError) {
        console.error("Error checking token balance:", balanceError);
        if (balanceError instanceof Error && balanceError.message.includes("Insufficient token balance")) {
          throw balanceError; // Re-throw specific balance errors
        }
      }
      
      console.log("🔧 Calling stakeExistingTokens function with Anchor");
      
      // Call the Anchor-based staking function
      const stakeResult = await stakeExistingTokens(
        publicKey.toString(),
        amount,
        wallet
      );
      
      // Check if there was an error in creating the transaction
      if (stakeResult.error) {
        console.error("❌ Error from stakeExistingTokens:", stakeResult.error);
        throw new Error(stakeResult.error);
      }
      
      // If we got a signature directly from the Anchor transaction, we're done
      if (stakeResult.signature) {
        console.log("✅ Anchor transaction successful with signature:", stakeResult.signature);
        
        // Success! Show confirmation
        toast({
          title: 'Staking successful!',
          description: `Successfully staked ${amount} HATM tokens.`,
        });
        
        // Clear form and refresh data
        setStakeAmount('');
        setIsStaking(false);
        refreshAllData();
        return;
      }
      
      // Use our V3 transaction handler to process the transaction
      toast({
        title: 'Processing transaction',
        description: 'Please approve the transaction in your wallet',
      });
      
      // Call our Anchor-based staking function
      const txResult = await executeStakingTransaction(
        publicKey.toString(),
        amount,
        {
          publicKey,
          signTransaction,
          signAllTransactions: async (txs: any[]) => {
            return Promise.all(txs.map(tx => signTransaction!(tx)));
          },
          sendTransaction: async (tx: any) => {
            if (!wallet.sendTransaction) {
              throw new Error("Wallet adapter doesn't support sendTransaction");
            }
            return await wallet.sendTransaction(tx, connection);
          }
        }
      );
      
      if (txResult.signature && !txResult.error) {
        console.log('✅ Transaction successful with signature:', txResult.signature);
        
        // Success! Show confirmation
        toast({
          title: 'Staking successful!',
          description: `Successfully staked ${amount} HATM tokens. Transaction: ${txResult.signature?.substring(0, 8)}...`,
        });
        
        // Clear form and refresh data
        setStakeAmount('');
        setIsStaking(false);
        refreshAllData();
      } else {
        console.error('❌ Transaction failed:', txResult.error);
        
        toast({
          title: 'Transaction failed',
          description: txResult.error || 'Unknown error',
          variant: 'destructive'
        });
        
        setIsStaking(false);
      }
    } catch (error: any) {
      console.error('❌ Error processing transaction:', error);
      
      toast({
        title: 'Transaction failed',
        description: `Error: ${error.message || 'Unknown error'}`,
        variant: 'destructive'
      });
      
      setIsStaking(false);
    }
  };

  const handleUnstake = async () => {
    toast({
      title: 'Coming soon',
      description: 'Unstaking feature is coming soon',
    });
  };

  const handleClaimRewards = async () => {
    toast({
      title: 'Coming soon',
      description: 'Claiming rewards feature is coming soon',
    });
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-2xl">
              <GradientText>HATM Staking</GradientText>
            </CardTitle>
            <CardDescription>Stake your HATM tokens and earn rewards</CardDescription>
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            className="flex items-center gap-1" 
            onClick={refreshAllData}
          >
            <RefreshCcw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {!connected ? (
          <Alert className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wallet not connected</AlertTitle>
            <AlertDescription>
              Please connect your wallet to view your staking information.
            </AlertDescription>
          </Alert>
        ) : loading ? (
          <div className="space-y-4">
            <Skeleton className="h-[60px] w-full rounded-xl" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-[120px] w-full rounded-xl" />
              <Skeleton className="h-[120px] w-full rounded-xl" />
              <Skeleton className="h-[120px] w-full rounded-xl" />
            </div>
          </div>
        ) : error ? (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error loading staking data</AlertTitle>
            <AlertDescription>
              {typeof error === 'string' ? error : 'Could not load staking information. Please try again later.'}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Staking stats overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-muted/30 rounded-xl p-4 flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5" /> Your Staked Amount
                </span>
                <span className="text-2xl font-bold mt-1">
                  {formatNumber(stakingInfo?.amountStaked || 0)} HATM
                </span>
                {stakingInfo?.walletTokenBalance !== undefined && (
                  <span className="text-xs text-muted-foreground mt-1">
                    Available: {formatNumber(stakingInfo.walletTokenBalance)} HATM
                  </span>
                )}
              </div>

              <div className="bg-muted/30 rounded-xl p-4 flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" /> Pending Rewards
                </span>
                <span className="text-2xl font-bold mt-1">
                  {formatNumber(stakingInfo?.pendingRewards || 0)} HATM
                </span>
                <div className="mt-1">
                  <span className="text-xs text-muted-foreground">
                    <span className="text-primary font-medium">
                      {stakingInfo?.estimatedAPY || 0}% APY
                    </span>
                  </span>
                </div>
              </div>

              <div className="bg-muted/30 rounded-xl p-4 flex flex-col">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Lock Status
                </span>
                {stakingInfo?.timeUntilUnlock ? (
                  <>
                    <span className="text-2xl font-bold mt-1">
                      {formatTimeRemaining(stakingInfo.timeUntilUnlock)}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      Until tokens unlock
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl font-bold mt-1 flex items-center gap-1">
                      {stakingInfo?.isLocked ? (
                        <Badge variant="destructive">Locked</Badge>
                      ) : (
                        <Badge variant="outline">Unlocked</Badge>
                      )}
                    </span>
                    <span className="text-xs text-muted-foreground mt-1">
                      {stakingInfo?.isLocked ? '7-day lock period' : 'No tokens staked'}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Staking actions */}
            <Tabs defaultValue="stake" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="stake">Stake</TabsTrigger>
                <TabsTrigger value="unstake">Unstake</TabsTrigger>
                <TabsTrigger value="rewards">Claim Rewards</TabsTrigger>
              </TabsList>
              
              <TabsContent value="stake" className="mt-4">
                <div className="space-y-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="stake-amount">Amount to Stake</Label>
                    <div className="flex w-full items-center space-x-2">
                      <Input
                        type="number"
                        id="stake-amount"
                        placeholder="Enter amount"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        disabled={isStaking}
                      />
                      <Button 
                        type="submit" 
                        onClick={handleStake}
                        disabled={isStaking || !stakeAmount}
                      >
                        {isStaking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isStaking ? 'Staking...' : 'Stake'}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Staked tokens are locked for 7 days.
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="unstake" className="mt-4">
                <div className="space-y-4">
                  <div className="grid w-full gap-1.5">
                    <Label htmlFor="unstake-amount">Amount to Unstake</Label>
                    <div className="flex w-full items-center space-x-2">
                      <Input
                        type="number"
                        id="unstake-amount"
                        placeholder="Enter amount"
                        value={unstakeAmount}
                        onChange={(e) => setUnstakeAmount(e.target.value)}
                        disabled={isUnstaking || stakingInfo?.isLocked}
                      />
                      <Button 
                        type="submit" 
                        onClick={handleUnstake}
                        disabled={isUnstaking || !unstakeAmount || stakingInfo?.isLocked || Number(stakingInfo?.amountStaked) === 0}
                      >
                        {isUnstaking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {isUnstaking ? 'Unstaking...' : 'Unstake'}
                      </Button>
                    </div>
                    {stakingInfo?.isLocked ? (
                      <div className="mt-2">
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Locked Period</AlertTitle>
                          <AlertDescription>
                            Your tokens are still in the 7-day lock period.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : Number(stakingInfo?.amountStaked) === 0 ? (
                      <div className="mt-2">
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertTitle>No tokens staked</AlertTitle>
                          <AlertDescription>
                            You don't have any tokens staked yet.
                          </AlertDescription>
                        </Alert>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        You can unstake up to {formatNumber(stakingInfo?.amountStaked || 0)} HATM.
                      </p>
                    )}
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="rewards" className="mt-4">
                <div className="space-y-4">
                  <div className="flex flex-col gap-4">
                    <div className="bg-muted/30 rounded-xl p-4">
                      <h3 className="text-lg font-semibold">Available Rewards</h3>
                      <p className="text-3xl font-bold mt-2">
                        {formatNumber(stakingInfo?.pendingRewards || 0)} HATM
                      </p>
                      <div className="mt-4">
                        <Button 
                          onClick={handleClaimRewards}
                          disabled={isClaiming || Number(stakingInfo?.pendingRewards) === 0}
                          className="w-full"
                        >
                          {isClaiming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isClaiming ? 'Claiming...' : 'Claim Rewards'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Global Staking Stats */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-2">Global Staking Stats</h3>
              <div className="bg-muted/30 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Staked</p>
                  <p className="font-bold">{formatNumber(stakingStats?.totalStaked || 0)} HATM</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">APY</p>
                  <p className="font-bold">{stakingStats?.currentAPY || 0}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Total Stakers</p>
                  <p className="font-bold">{stakingStats?.stakersCount || 0}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Reward Pool</p>
                  <p className="font-bold">{formatNumber(stakingStats?.rewardPool || 0)} HATM</p>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SimpleStakingWidget;