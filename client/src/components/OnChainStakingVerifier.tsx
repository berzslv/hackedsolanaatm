import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@solana/wallet-adapter-react';
import { apiRequest } from '@/lib/queryClient';

/**
 * On-Chain Staking Verifier
 * This component provides a direct way to check on-chain staking status
 * bypassing the Railway API and directly checking the blockchain
 */
export function OnChainStakingVerifier() {
  const { publicKey } = useWallet();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  
  const walletAddress = publicKey?.toString();
  
  const checkOnChainStatus = async () => {
    if (!walletAddress) {
      setError('Please connect your wallet');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Direct fetch - not using react-query for simplicity
      const response = await fetch(`/api/on-chain-staking/${walletAddress}`);
      const data = await response.json();
      
      console.log('On-chain verification result:', data);
      setResult(data);
    } catch (err) {
      console.error('Error checking on-chain status:', err);
      setError('Failed to check on-chain status');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <Card className="max-w-md mx-auto">
      <CardHeader>
        <CardTitle>On-Chain Staking Verification</CardTitle>
        <CardDescription>
          Directly check your staking status on the Solana blockchain
        </CardDescription>
      </CardHeader>
      <CardContent>
        {walletAddress ? (
          <div className="space-y-2">
            <p className="text-sm">Connected Wallet:</p>
            <p className="font-mono text-xs break-all bg-muted p-2 rounded">
              {walletAddress}
            </p>
            
            {result && (
              <div className="mt-4 p-2 bg-muted/50 rounded border">
                <h4 className="font-semibold">Verification Result:</h4>
                <div className="text-sm mt-2 space-y-1">
                  <div>
                    <span className="font-medium">Account exists:</span>{' '}
                    {result.accountExists ? 'Yes ✅' : 'No ❌'}
                  </div>
                  
                  {result.isProgramOwned !== undefined && (
                    <div>
                      <span className="font-medium">Owned by staking program:</span>{' '}
                      {result.isProgramOwned ? 'Yes ✅' : 'No ❌'}
                    </div>
                  )}
                  
                  {result.dataSize !== undefined && (
                    <div>
                      <span className="font-medium">Data size:</span>{' '}
                      {result.dataSize} bytes
                    </div>
                  )}
                  
                  {result.isInitialized !== undefined && (
                    <div>
                      <span className="font-medium">Initialized:</span>{' '}
                      {result.isInitialized ? 'Yes ✅' : 'No ❌'}
                    </div>
                  )}
                  
                  {result.message && (
                    <div className="text-sm mt-2 font-medium">
                      {result.message}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {error && (
              <div className="text-destructive text-sm mt-2">
                {error}
              </div>
            )}
          </div>
        ) : (
          <p className="text-yellow-600">Please connect your wallet to verify staking status</p>
        )}
      </CardContent>
      <CardFooter>
        <Button 
          onClick={checkOnChainStatus} 
          disabled={!walletAddress || loading}
          className="w-full"
        >
          {loading ? 'Checking...' : 'Check On-Chain Status'}
        </Button>
      </CardFooter>
    </Card>
  );
}