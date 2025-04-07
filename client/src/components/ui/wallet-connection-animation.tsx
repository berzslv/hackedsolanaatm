import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSolana } from '@/context/SolanaContext';
import { formatNumber } from '@/lib/utils';

type WalletConnectionAnimationProps = {
  onAnimationComplete?: () => void;
};

const WalletConnectionAnimation = ({ onAnimationComplete }: WalletConnectionAnimationProps) => {
  const { connected, walletType, publicKey, balance } = useSolana();
  const [showAnimation, setShowAnimation] = useState(false);
  const [animationStage, setAnimationStage] = useState<'connecting' | 'connected' | 'done'>('connecting');
  
  // Define wallet logo based on wallet type
  const getWalletLogo = () => {
    switch (walletType) {
      case 'phantom':
        return 'https://www.gitbook.com/cdn-cgi/image/width=40,height=40,fit=contain,dpr=2,format=auto/https%3A%2F%2F4041291184-files.gitbook.io%2F~%2Ffiles%2Fv0%2Fb%2Fgitbook-x-prod.appspot.com%2Fo%2Fspaces%252FRVAQmqN6EzjVxaEURFFv%252Ficon%252FJtS5iRHJgAy9PrSWxrP1%252FPhantom.png%3Falt%3Dmedia%26token%3D4b2c9608-b9bd-4ce4-9c97-0d0d9842c790';
      case 'solflare':
        return 'https://solflare.com/images/logo-icon.svg';
      case 'slope':
        return 'https://slope.finance/assets/img/logo.svg';
      case 'sollet':
        return 'https://cdn.jsdelivr.net/gh/solana-labs/oyster@main/assets/wallets/sollet.svg';
      case 'math':
        return 'https://mathwallet.org/icon/logo.svg';
      case 'coin98':
        return 'https://coin98.com/images/logo-coin98.svg';
      default:
        return 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';
    }
  };
  
  // Trigger animation when connecting wallet
  useEffect(() => {
    if (connected && publicKey) {
      setShowAnimation(true);
      setAnimationStage('connecting');
      
      // Sequence the animation
      const connectingTimer = setTimeout(() => {
        setAnimationStage('connected');
        
        const connectedTimer = setTimeout(() => {
          setAnimationStage('done');
          
          const doneTimer = setTimeout(() => {
            setShowAnimation(false);
            if (onAnimationComplete) onAnimationComplete();
          }, 1000);
          
          return () => clearTimeout(doneTimer);
        }, 2000);
        
        return () => clearTimeout(connectedTimer);
      }, 1500);
      
      return () => clearTimeout(connectingTimer);
    }
  }, [connected, publicKey, onAnimationComplete]);
  
  if (!showAnimation) return null;
  
  return (
    <AnimatePresence>
      {showAnimation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div 
            className="bg-card border border-border rounded-2xl p-8 w-[320px] flex flex-col items-center"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            {animationStage === 'connecting' && (
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <motion.div 
                    className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center"
                    animate={{ 
                      scale: [1, 1.2, 1],
                    }}
                    transition={{ 
                      duration: 1.5,
                      repeat: Infinity,
                      repeatType: 'loop'
                    }}
                  >
                    <img src={getWalletLogo()} alt="Wallet" className="w-12 h-12 object-contain" />
                  </motion.div>
                  <motion.div 
                    className="absolute inset-0 rounded-full border-4 border-primary"
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ 
                      scale: [0.7, 1.3, 0.7],
                      opacity: [0, 0.8, 0] 
                    }}
                    transition={{ 
                      duration: 2,
                      repeat: Infinity
                    }}
                  />
                </div>
                <h3 className="text-lg font-medium mt-2">Connecting to {walletType || 'wallet'}...</h3>
                <p className="text-sm text-muted-foreground text-center">
                  Please approve the connection request in your wallet
                </p>
              </div>
            )}
            
            {animationStage === 'connected' && (
              <div className="flex flex-col items-center gap-4">
                <motion.div
                  initial={{ scale: 0, rotate: -180 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: 'spring', damping: 10, stiffness: 100 }}
                  className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center"
                >
                  <div className="w-16 h-16 rounded-full bg-card border-2 border-green-500 flex items-center justify-center">
                    <img src={getWalletLogo()} alt="Wallet" className="w-10 h-10 object-contain" />
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <h3 className="text-lg font-medium text-center">Connected to {walletType || 'wallet'}</h3>
                  
                  <div className="mt-2 bg-muted rounded-lg p-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Address:</span>
                      <span className="font-mono text-xs truncate max-w-[150px]">
                        {publicKey?.toString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm mt-1">
                      <span className="text-muted-foreground">Balance:</span>
                      <div className="flex items-center gap-1">
                        <img 
                          src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png" 
                          alt="SOL" 
                          className="w-3 h-3"
                        />
                        <span className="font-mono">{formatNumber(balance, { decimals: 4 })} SOL</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
                
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                  className="w-full mt-2 flex justify-center"
                >
                  <div className="px-3 py-1 rounded-full bg-green-500/20 text-green-500 text-sm font-medium flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-check"><path d="M20 6 9 17l-5-5"/></svg>
                    Connection Successful
                  </div>
                </motion.div>
              </div>
            )}
            
            {animationStage === 'done' && (
              <motion.div 
                className="flex flex-col items-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                <h3 className="text-lg font-medium mt-2">Ready to go!</h3>
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default WalletConnectionAnimation;