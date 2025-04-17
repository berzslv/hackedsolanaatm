import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';
import { useWallet } from '@solana/wallet-adapter-react';

/**
 * Component for syncing on-chain staking data
 * This allows users to force a sync with on-chain data when
 * their staking balance is not showing correctly in the UI
 */
export const OnChainStakingVerifier: React.FC = () => {
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { publicKey } = useWallet();

  if (!publicKey) {
    return null; // Only show when wallet is connected
  }

  const walletAddress = publicKey.toString();

  const handleForceSync = async () => {
    try {
      setIsSyncing(true);
      
      // Call the force sync endpoint
      const response = await apiRequest<{ success: boolean; message: string; stakingData: any }>(
        '/api/on-chain/force-sync',
        {
          method: 'POST',
          body: JSON.stringify({ walletAddress }),
        }
      );

      if (response.success) {
        toast({
          title: 'On-chain sync successful',
          description: 'Your staking data has been synchronized with the blockchain.',
        });
        
        // Invalidate the staking info cache to force a refresh
        queryClient.invalidateQueries({ queryKey: ['/api/staking-info', walletAddress] });
      } else {
        toast({
          title: 'Sync failed',
          description: response.message || 'Unable to sync with blockchain data.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error syncing on-chain data:', error);
      toast({
        title: 'Sync error',
        description: 'An error occurred while syncing with blockchain data.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="w-full bg-gradient-to-br from-violet-500/10 to-purple-500/5">
      <CardHeader>
        <CardTitle className="text-lg md:text-xl">On-Chain Verification</CardTitle>
        <CardDescription>
          Sync your staking data directly from the blockchain if your balance isn't showing correctly.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm mb-4">
          If you've staked tokens but they don't appear in your dashboard, use this tool to
          force a synchronization with on-chain data.
        </p>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleForceSync} 
          disabled={isSyncing}
          className="w-full"
          variant="outline"
        >
          {isSyncing ? 'Syncing...' : 'Sync with Blockchain'}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default OnChainStakingVerifier;