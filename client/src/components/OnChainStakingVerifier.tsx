/**
 * On-Chain Staking Verifier
 * This component provides a direct way to check on-chain staking status
 * bypassing the Railway API and directly checking the blockchain
 */
import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { formatNumber, formatDate, abbreviateAddress } from "@/lib/formatting";

export function OnChainStakingVerifier() {
  const { publicKey } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stakingInfo, setStakingInfo] = useState<any>(null);
  const [vaultBalance, setVaultBalance] = useState<number>(0);
  
  // Wallet address for verification - defaults to connected wallet
  const walletAddress = publicKey?.toString();
  
  async function verifyOnChain() {
    if (!walletAddress) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Call our direct blockchain verification endpoint
      const response = await fetch(`/api/on-chain-verify/${walletAddress}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to verify staking on-chain");
      }
      
      const data = await response.json();
      console.log("On-chain verification result:", data);
      
      setStakingInfo(data.stakingInfo);
      setVaultBalance(data.vaultBalance);
    } catch (error) {
      console.error("Error verifying staking on-chain:", error);
      setError(error instanceof Error ? error.message : "Failed to verify on blockchain");
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <Card className="w-full max-w-lg mx-auto border border-neutral-200 dark:border-neutral-800">
      <CardHeader>
        <CardTitle className="text-xl font-bold">On-Chain Staking Verification</CardTitle>
        <CardDescription>
          Check your staking status directly on the Solana blockchain
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {!walletAddress ? (
          <div className="text-center p-4">
            <p className="text-neutral-500 dark:text-neutral-400">
              Connect your wallet to verify staking status on-chain
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Wallet</span>
              <span className="text-sm text-neutral-500">
                {abbreviateAddress(walletAddress)}
              </span>
            </div>
            
            {stakingInfo && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Account Status</span>
                  <span className="text-sm">
                    {stakingInfo.isInitialized ? (
                      <span className="text-green-500">Initialized ✓</span>
                    ) : (
                      <span className="text-yellow-500">Not Initialized</span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Account Owner</span>
                  <span className="text-sm">
                    {stakingInfo.isProgramOwned ? (
                      <span className="text-green-500">Correct Program ✓</span>
                    ) : (
                      <span className="text-red-500">Invalid Owner</span>
                    )}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Last Update</span>
                  <span className="text-sm text-neutral-500">
                    {stakingInfo.lastUpdateTime ? formatDate(new Date(stakingInfo.lastUpdateTime)) : 'N/A'}
                  </span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Vault Balance</span>
                  <span className="text-sm text-neutral-500">
                    {formatNumber(vaultBalance)} HATM
                  </span>
                </div>
                
                <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-md">
                  <p className="text-sm text-neutral-600 dark:text-neutral-300">
                    <strong>Note:</strong> This is a direct blockchain verification. If your staking account 
                    exists and is owned by the correct program, your stake is confirmed regardless of 
                    what the Railway API shows.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter>
        <Button 
          className="w-full"
          disabled={!walletAddress || isLoading}
          onClick={verifyOnChain}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Verifying On-Chain
            </>
          ) : (
            "Verify Staking On-Chain"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}