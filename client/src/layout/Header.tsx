import { useState } from 'react';
import { Link } from 'wouter';
import { WalletButton } from '@/components/ui/wallet-button';
import { useWalletContext } from '@/context/WalletContext';
import { ThemeToggle } from '@/components/ui/theme-toggle';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { connected } = useWalletContext();
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/90 backdrop-blur-md z-50 border-b border-border">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-2">
          <div className="relative w-10 h-10 flex items-center justify-center bg-card rounded-full overflow-hidden">
            <i className="ri-bank-fill text-primary text-2xl"></i>
            <div className="absolute inset-0 animate-pulse-slow opacity-50 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full"></div>
          </div>
          <span className="font-display text-xl text-foreground">Hacked<span className="text-primary">ATM</span></span>
        </Link>
        
        <div className="hidden lg:flex items-center space-x-6">
          <a href="#about" className="text-foreground/80 hover:text-primary transition-colors">About</a>
          <a href="#staking" className="text-foreground/80 hover:text-primary transition-colors">Staking</a>
          <a href="#referral" className="text-foreground/80 hover:text-primary transition-colors">Referral</a>
          <a href="#leaderboard" className="text-foreground/80 hover:text-primary transition-colors">Leaderboard</a>
          <a href="#faq" className="text-foreground/80 hover:text-primary transition-colors">FAQ</a>
          <Link href="/whitepaper" className="text-foreground/80 hover:text-primary transition-colors">Whitepaper</Link>
        </div>
        
        <div className="flex items-center gap-3">
          <ThemeToggle className="hidden sm:flex" />
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
        <div className="lg:hidden bg-card border-b border-border">
          <div className="container mx-auto px-4 py-3 flex flex-col space-y-4">
            <a href="#about" className="text-foreground/80 hover:text-primary py-2 transition-colors">About</a>
            <a href="#staking" className="text-foreground/80 hover:text-primary py-2 transition-colors">Staking</a>
            <a href="#referral" className="text-foreground/80 hover:text-primary py-2 transition-colors">Referral</a>
            <a href="#leaderboard" className="text-foreground/80 hover:text-primary py-2 transition-colors">Leaderboard</a>
            <a href="#faq" className="text-foreground/80 hover:text-primary py-2 transition-colors">FAQ</a>
            <Link href="/whitepaper" className="text-foreground/80 hover:text-primary py-2 transition-colors">Whitepaper</Link>
            <div className="flex items-center gap-2 py-2">
              <span className="text-foreground/80">Theme:</span>
              <ThemeToggle />
            </div>
            {!connected && (
              <WalletButton 
                variant="gradient" 
                className="sm:hidden w-full"
              />
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
