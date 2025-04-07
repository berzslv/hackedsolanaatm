import { useRef, useEffect } from 'react';
import { useWalletContext } from '@/context/WalletContext';

export function WalletModal() {
  const { showWalletModal, setShowWalletModal, connectWallet } = useWalletContext();
  const modalRef = useRef<HTMLDivElement>(null);

  const handleOutsideClick = (event: MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
      setShowWalletModal(false);
    }
  };

  useEffect(() => {
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  if (!showWalletModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-dark-900/90 backdrop-blur-sm flex items-center justify-center">
      <div ref={modalRef} className="bg-dark-800 rounded-xl p-6 max-w-md w-full mx-4 border border-dark-600 relative">
        <button 
          className="absolute top-4 right-4 text-light-300 hover:text-white"
          onClick={() => setShowWalletModal(false)}
        >
          <i className="ri-close-line text-xl"></i>
        </button>
        
        <h3 className="text-xl font-semibold mb-6 text-white">Connect Your Wallet</h3>
        
        <div className="space-y-3">
          <button 
            className="w-full bg-dark-700 hover:bg-dark-600 transition-colors rounded-lg p-4 flex items-center justify-between"
            onClick={() => connectWallet('phantom')}
          >
            <div className="flex items-center gap-3">
              <img src="https://phantom.app/img/logo.png" alt="Phantom" className="w-8 h-8" />
              <span className="text-white font-medium">Phantom</span>
            </div>
            <i className="ri-arrow-right-line text-light-300"></i>
          </button>
          
          <button 
            className="w-full bg-dark-700 hover:bg-dark-600 transition-colors rounded-lg p-4 flex items-center justify-between"
            onClick={() => connectWallet('solflare')}
          >
            <div className="flex items-center gap-3">
              <img src="https://solflare.com/assets/logo.svg" alt="Solflare" className="w-8 h-8" />
              <span className="text-white font-medium">Solflare</span>
            </div>
            <i className="ri-arrow-right-line text-light-300"></i>
          </button>
          
          <button 
            className="w-full bg-dark-700 hover:bg-dark-600 transition-colors rounded-lg p-4 flex items-center justify-between"
            onClick={() => connectWallet('backpack')}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#6966ff] rounded-full flex items-center justify-center">
                <i className="ri-shopping-bag-line text-white"></i>
              </div>
              <span className="text-white font-medium">Backpack</span>
            </div>
            <i className="ri-arrow-right-line text-light-300"></i>
          </button>
        </div>
        
        <div className="mt-6 text-center text-sm text-light-300">
          <p>By connecting your wallet, you agree to our <a href="#" className="text-primary">Terms of Service</a></p>
        </div>
      </div>
    </div>
  );
}
