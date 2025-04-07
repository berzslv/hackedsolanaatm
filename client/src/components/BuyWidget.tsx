import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useWalletContext } from '@/context/WalletContext';
import { useTokenData } from '@/context/TokenDataContext';
import { formatNumber } from '@/lib/utils';

const BuyWidget = () => {
  const { connected, setShowWalletModal } = useWalletContext();
  const { tokenPrice } = useTokenData();
  const [solAmount, setSolAmount] = useState<string>('');
  const [hatchAmount, setHatchAmount] = useState<string>('');
  
  const handleSolInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSolAmount(value);
    
    // Calculate HATM amount based on SOL input
    if (value && !isNaN(parseFloat(value))) {
      const hatmAmount = parseFloat(value) / tokenPrice;
      setHatchAmount(hatmAmount.toFixed(2));
    } else {
      setHatchAmount('');
    }
  };
  
  const handleHatmInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setHatchAmount(value);
    
    // Calculate SOL amount based on HATM input
    if (value && !isNaN(parseFloat(value))) {
      const solAmount = parseFloat(value) * tokenPrice;
      setSolAmount(solAmount.toFixed(4));
    } else {
      setSolAmount('');
    }
  };
  
  const handleBuy = () => {
    if (!connected) {
      setShowWalletModal(true);
      return;
    }
    
    // Process buy transaction
    alert('Buy functionality will be implemented when connected to Solana blockchain');
  };
  
  return (
    <div className="relative max-w-md mx-auto">
      <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-3xl blur-3xl opacity-30"></div>
      <div className="bg-dark-800/80 backdrop-blur-sm border border-dark-600 rounded-3xl p-6 relative z-10">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-display text-white">ATM Terminal</h3>
          <div className="flex gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
          </div>
        </div>
        
        <div className="bg-dark-900 rounded-lg p-4 mb-6 font-mono">
          <div className="flex justify-between mb-2">
            <span className="text-light-300">Token:</span>
            <span className="text-primary">$HATM</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-light-300">Network:</span>
            <span className="text-secondary">Solana</span>
          </div>
          <div className="flex justify-between mb-2">
            <span className="text-light-300">Current Price:</span>
            <span className="text-accent">${formatNumber(tokenPrice, { decimals: 4 })}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-light-300">Staking APY:</span>
            <span className="text-primary">{formatNumber(125, { suffix: '%' })}</span>
          </div>
        </div>
        
        <div className="bg-dark-700 rounded-lg p-4 mb-6">
          <h4 className="text-white mb-3 font-medium">Buy $HATM</h4>
          <div className="bg-dark-600 rounded-lg p-3 mb-4 flex justify-between items-center">
            <Input 
              type="number" 
              placeholder="0.0" 
              className="bg-transparent w-2/3 outline-none border-none"
              value={solAmount}
              onChange={handleSolInputChange}
            />
            <div className="flex items-center gap-2 bg-dark-800 px-3 py-1 rounded-lg">
              <img src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" alt="SOL" className="w-5 h-5" />
              <span>SOL</span>
            </div>
          </div>
          
          <div className="flex justify-center mb-4">
            <i className="ri-arrow-down-line text-light-300"></i>
          </div>
          
          <div className="bg-dark-600 rounded-lg p-3 mb-4 flex justify-between items-center">
            <Input 
              type="number" 
              placeholder="0.0" 
              className="bg-transparent w-2/3 outline-none border-none"
              value={hatchAmount}
              onChange={handleHatmInputChange}
            />
            <div className="flex items-center gap-2 bg-dark-800 px-3 py-1 rounded-lg">
              <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center text-dark-900 text-xs">H</div>
              <span>HATM</span>
            </div>
          </div>
          
          <Button 
            className="w-full py-3 bg-gradient-to-r from-primary to-secondary rounded-lg font-medium text-dark-900 hover:opacity-90 transition-opacity"
            onClick={handleBuy}
          >
            {connected ? 'Buy HATM' : 'Connect Wallet to Buy'}
          </Button>
        </div>
        
        <div className="text-xs text-light-300 bg-dark-900/50 p-2 rounded-lg">
          <p className="flex items-center gap-1">
            <i className="ri-information-line"></i>
            6% referral fee | 8% without referral
          </p>
        </div>
      </div>
    </div>
  );
};

export default BuyWidget;
