import { useState } from 'react';
import { Link } from 'wouter';
import { WalletButton } from '@/components/ui/wallet-button';
import { useSolana } from '@/context/SolanaContext';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { connected } = useSolana();
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/90 dark:bg-[#1a1432]/95 backdrop-blur-md z-50 border-b border-border">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center relative">
        {/* Header Pattern Elements */}
        <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/10 rounded-full"></div>
          <div className="absolute -left-12 -bottom-12 w-24 h-24 bg-secondary/10 rounded-full"></div>
          <div className="absolute left-1/3 top-1/2 w-3 h-3 bg-primary/20 rounded-full"></div>
          <div className="absolute right-1/4 bottom-1/4 w-2 h-2 bg-secondary/20 rounded-full"></div>
          <div className="absolute left-1/2 top-1/4 w-4 h-4 bg-accent/20 rounded-full"></div>
        </div>
        
        <Link href="/" className="flex items-center gap-2 z-10">
          <div className="relative w-10 h-10 flex items-center justify-center bg-card rounded-full overflow-hidden">
            <i className="ri-bank-fill text-primary text-2xl"></i>
            <div className="absolute inset-0 animate-pulse-slow opacity-50 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full"></div>
          </div>
          <span className="font-display text-xl text-foreground">Hacked<span className="text-primary">ATM</span></span>
        </Link>
        
        <div className="hidden lg:flex items-center space-x-6 z-10">
          <a href="#about" className="text-foreground/80 hover:text-primary transition-colors">About</a>
          <a href="#staking" className="text-foreground/80 hover:text-primary transition-colors">Staking</a>
          <a href="#referral" className="text-foreground/80 hover:text-primary transition-colors">Referral</a>
          <a href="#leaderboard" className="text-foreground/80 hover:text-primary transition-colors">Leaderboard</a>
          <a href="#faq" className="text-foreground/80 hover:text-primary transition-colors">FAQ</a>
          <Link href="/whitepaper" className="text-foreground/80 hover:text-primary transition-colors">Whitepaper</Link>
        </div>
        
        <div className="flex items-center gap-3 z-10">
          <WalletButton />
          <button 
            className="lg:hidden text-foreground/80 hover:text-primary" 
            onClick={toggleMenu}
          >
            <i className="ri-menu-line text-2xl"></i>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-card/95 backdrop-blur-sm border-b border-border">
          <div className="container mx-auto px-4 py-3 flex flex-col space-y-4 relative">
            {/* Mobile Pattern Elements */}
            <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-primary/10 rounded-full"></div>
              <div className="absolute right-1/4 bottom-1/4 w-2 h-2 bg-secondary/20 rounded-full"></div>
            </div>
            
            <a href="#about" className="text-foreground/80 hover:text-primary py-2 transition-colors z-10">About</a>
            <a href="#staking" className="text-foreground/80 hover:text-primary py-2 transition-colors z-10">Staking</a>
            <a href="#referral" className="text-foreground/80 hover:text-primary py-2 transition-colors z-10">Referral</a>
            <a href="#leaderboard" className="text-foreground/80 hover:text-primary py-2 transition-colors z-10">Leaderboard</a>
            <a href="#faq" className="text-foreground/80 hover:text-primary py-2 transition-colors z-10">FAQ</a>
            <Link href="/whitepaper" className="text-foreground/80 hover:text-primary py-2 transition-colors z-10">Whitepaper</Link>
            {!connected && (
              <WalletButton 
                onClick={() => {}}
                className="sm:hidden w-full z-10"
              />
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
