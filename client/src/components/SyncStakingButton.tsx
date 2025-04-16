import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCcw } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useSolana } from '@/hooks/use-solana';

interface SyncStakingButtonProps {
  onSuccess?: () => void;
}

export function SyncStakingButton({ onSuccess }: SyncStakingButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  const { connected, publicKey } = useSolana();

  const handleSyncStaking = async () => {
    if (!connected || !publicKey) {
      toast({
        title: 'Wallet not connected',
        description: 'Please connect your wallet to sync staking records',
        variant: 'destructive'
      });
      return;
    }
    
    setIsSyncing(true);
    
    try {
      toast({
        title: 'Syncing staking records',
        description: 'Please wait while we sync your staking records...',
      });
      
      const response = await fetch('/api/sync-staking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: publicKey.toString()
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to sync staking records');
      }
      
      const data = await response.json();
      
      if (data.success) {
        toast({
          title: 'Staking records synced',
          description: data.stakingData.amountStaked > 0 
            ? `Successfully synced ${Number(data.stakingData.amountStaked).toFixed(2)} tokens` 
            : "No tokens to sync were found",
          variant: data.stakingData.amountStaked > 0 ? 'default' : 'destructive'
        });
        
        // Call the success callback if provided
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (error) {
      console.error('Error syncing staking records:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to sync staking records',
        variant: 'destructive'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSyncStaking}
      disabled={!connected || isSyncing}
      variant="outline"
      className="w-full mb-2"
    >
      {isSyncing ? (
        <>
          <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
          Syncing...
        </>
      ) : (
        <>
          <RefreshCcw className="mr-2 h-4 w-4" />
          Sync Staking Records
        </>
      )}
    </Button>
  );
}