import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useSolana } from '@/context/SolanaContext';
import WhitepaperDialog from '@/components/WhitepaperDialog';
import { SolanaWalletButton } from '@/components/ui/wallet-adapter';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWhitepaper, setShowWhitepaper] = useState(false);
  const { connected } = useSolana();
  const [location] = useLocation();
  
  const NavigationLink = ({ href, children }: { href: string, children: React.ReactNode }) => {
    const [location] = useLocation();
    const isHome = location === '/';
    
    if (!isHome && href.startsWith('/#')) {
      return (
        <Link href={href} className="text-foreground/80 hover:text-primary transition-colors">
          {children}
        </Link>
      );
    }
    return (
      <a href={href.replace('/#', '#')} className="text-foreground/80 hover:text-primary transition-colors">
        {children}
      </a>
    );
  };
  
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
          <NavigationLink href="/#about">About</NavigationLink>
          <NavigationLink href="/#staking">Staking</NavigationLink>
          <NavigationLink href="/#referral">Referral</NavigationLink>
          <NavigationLink href="/#leaderboard">Leaderboard</NavigationLink>
          <NavigationLink href="/#faq">FAQ</NavigationLink>
          <button onClick={() => setShowWhitepaper(true)} className="text-foreground/80 hover:text-primary transition-colors">Whitepaper</button>
          <WhitepaperDialog open={showWhitepaper} onOpenChange={setShowWhitepaper} />
        </div>
        
        <div className="flex items-center gap-3 z-10">
          {/* Use the new Solana wallet adapter button */}
          <SolanaWalletButton />
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
            
            <NavigationLink href="/#about">About</NavigationLink>
            <NavigationLink href="/#staking">Staking</NavigationLink>
            <NavigationLink href="/#referral">Referral</NavigationLink>
            <NavigationLink href="/#leaderboard">Leaderboard</NavigationLink>
            <NavigationLink href="/#faq">FAQ</NavigationLink>
            <button onClick={() => setShowWhitepaper(true)} className="text-foreground/80 hover:text-primary py-2 transition-colors z-10 text-left w-full">Whitepaper</button>
            {/* Mobile wallet button */}
            <div className="sm:hidden w-full z-10">
              <SolanaWalletButton />
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
