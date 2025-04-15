import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useSolana } from '@/hooks/use-solana';
import WhitepaperDialog from '@/components/WhitepaperDialog';
import { SolanaWalletButton } from '@/components/ui/wallet-adapter';
import { cn } from '@/lib/utils';

// Smooth scroll function
const scrollToElement = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showWhitepaper, setShowWhitepaper] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('home');
  const { connected } = useSolana();
  const [location] = useLocation();
  
  // Check for hash in URL for smooth scrolling on load
  useEffect(() => {
    if (location === '/') {
      const hash = window.location.hash;
      if (hash) {
        // Remove the # and scroll to element
        const id = hash.substring(1);
        setTimeout(() => scrollToElement(id), 100);
        setActiveSection(id);
      }
    }
  }, [location]);
  
  // Track scroll position to highlight active nav item
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'about', 'staking', 'referral', 'leaderboard', 'faq'];
      
      // Find the section that is currently in view
      for (const section of sections) {
        const element = document.getElementById(section);
        if (element) {
          const rect = element.getBoundingClientRect();
          // If the section is in view (with some offset for better UX)
          if (rect.top <= 100 && rect.bottom >= 100) {
            setActiveSection(section);
            break;
          }
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  // Simple navigation link component for both desktop and mobile
  const NavLink = ({ href, children }: { href: string, children: React.ReactNode }) => {
    const section = href.replace('/#', '');
    const isActive = section === activeSection;
    
    return (
      <a 
        href={href}
        className={cn(
          "px-3 py-2 font-medium transition-colors",
          isActive ? "text-primary" : "text-gray-200 hover:text-primary"
        )}
        onClick={(e) => {
          e.preventDefault();
          if (location === '/') {
            // For smooth scrolling on home page
            const id = href.replace('/#', '');
            scrollToElement(id);
            setActiveSection(id);
          } else {
            // Redirect to home page with hash
            window.location.href = href;
          }
          // Close mobile menu if open
          if (isMenuOpen) {
            setIsMenuOpen(false);
          }
        }}
      >
        {children}
      </a>
    );
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#0f0b19] z-50 shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <a 
            href="/"
            className="flex items-center space-x-2"
            onClick={(e) => {
              if (location === '/') {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
                setActiveSection('home');
              }
            }}
          >
            <div className="w-10 h-10 rounded-full bg-[#1a1525] flex items-center justify-center">
              <i className="ri-bank-fill text-[#6366f1] text-xl"></i>
            </div>
            <div>
              <span className="text-white font-bold">Hacked<span className="text-[#6366f1]">ATM</span></span>
              <div className="text-[10px] -mt-1 text-teal-400">DEVNET MODE</div>
            </div>
          </a>
        </div>
        
        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          <NavLink href="/#home">Home</NavLink>
          <NavLink href="/#about">About</NavLink>
          <NavLink href="/#staking">Staking</NavLink>
          <NavLink href="/#referral">Referral</NavLink>
          <NavLink href="/#leaderboard">Leaderboard</NavLink>
          <NavLink href="/#faq">FAQ</NavLink>
          
          {/* Whitepaper button */}
          <button 
            onClick={() => setShowWhitepaper(true)}
            className="px-3 py-2 font-medium text-gray-200 hover:text-primary transition-colors"
          >
            Whitepaper
          </button>
          <WhitepaperDialog open={showWhitepaper} onOpenChange={setShowWhitepaper} />
        </nav>
        
        {/* Wallet Button */}
        <div className="flex items-center">
          <SolanaWalletButton />
          
          {/* Mobile Menu Button */}
          <button 
            className="ml-4 md:hidden text-white"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <i className={`text-xl ${isMenuOpen ? 'ri-close-line' : 'ri-menu-line'}`}></i>
          </button>
        </div>
      </div>
      
      {/* Mobile Navigation */}
      {isMenuOpen && (
        <nav className="md:hidden bg-[#0f0b19] border-t border-gray-800">
          <div className="container mx-auto px-4 py-2 flex flex-col">
            <NavLink href="/#home">Home</NavLink>
            <NavLink href="/#about">About</NavLink>
            <NavLink href="/#staking">Staking</NavLink>
            <NavLink href="/#referral">Referral</NavLink>
            <NavLink href="/#leaderboard">Leaderboard</NavLink>
            <NavLink href="/#faq">FAQ</NavLink>
            
            <button 
              onClick={() => {
                setShowWhitepaper(true);
                setIsMenuOpen(false);
              }}
              className="px-3 py-2 text-left font-medium text-gray-200 hover:text-primary transition-colors"
            >
              Whitepaper
            </button>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
