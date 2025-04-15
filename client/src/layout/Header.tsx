import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useSolana } from '@/hooks/use-solana';
import WhitepaperDialog from '@/components/WhitepaperDialog';
import { SolanaWalletButton } from '@/components/ui/wallet-adapter';
import { cn } from '@/lib/utils';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose
} from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';

// Smooth scroll function
const scrollToElement = (id: string) => {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({ behavior: 'smooth' });
  }
};

const Header = () => {
  const [showWhitepaper, setShowWhitepaper] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('home');
  const [isOpen, setIsOpen] = useState(false);
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
  const NavLink = ({ href, children, isMobile = false }: { href: string, children: React.ReactNode, isMobile?: boolean }) => {
    const section = href.replace('/#', '');
    const isActive = section === activeSection;
    
    return (
      <a 
        href={href}
        className={cn(
          "font-medium transition-colors",
          isMobile 
            ? "block w-full px-4 py-3 border-b border-gray-800 text-lg" 
            : "px-3 py-2",
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
          
          // Close mobile sheet if open
          if (isMobile) {
            setIsOpen(false);
          }
        }}
      >
        {children}
      </a>
    );
  };
  
  // Logo component for both header and mobile drawer
  const Logo = () => (
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
  );

  return (
    <header className="fixed top-0 left-0 right-0 bg-[#0f0b19] z-50 shadow-md">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center">
          <Logo />
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
        
        {/* Wallet Button and Mobile Menu */}
        <div className="flex items-center">
          <SolanaWalletButton />
          
          {/* Mobile Menu Sheet */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <button 
                className="ml-4 md:hidden w-10 h-10 flex items-center justify-center text-white rounded-full bg-[#1a1525]/80 hover:bg-[#1a1525]"
                aria-label="Open mobile menu"
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px] p-0 bg-[#0f0b19] border-l border-gray-800">
              <div className="flex flex-col h-full">
                <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Logo />
                  </div>
                  <SheetClose className="rounded-full h-8 w-8 flex items-center justify-center bg-[#1a1525]/80 hover:bg-[#1a1525] text-gray-200">
                    <X className="h-4 w-4" />
                  </SheetClose>
                </div>
                
                <div className="flex-1 overflow-auto py-2">
                  <nav className="flex flex-col">
                    <NavLink href="/#home" isMobile>Home</NavLink>
                    <NavLink href="/#about" isMobile>About</NavLink>
                    <NavLink href="/#staking" isMobile>Staking</NavLink>
                    <NavLink href="/#referral" isMobile>Referral</NavLink>
                    <NavLink href="/#leaderboard" isMobile>Leaderboard</NavLink>
                    <NavLink href="/#faq" isMobile>FAQ</NavLink>
                    
                    <button 
                      onClick={() => {
                        setShowWhitepaper(true);
                        setIsOpen(false);
                      }}
                      className="block w-full px-4 py-3 text-left text-lg font-medium text-gray-200 hover:text-primary transition-colors border-b border-gray-800"
                    >
                      Whitepaper
                    </button>
                  </nav>
                </div>
                
                <div className="p-4 border-t border-gray-800">
                  <div className="flex justify-center mb-4">
                    <SolanaWalletButton />
                  </div>
                  <p className="text-xs text-center text-gray-400">
                    © 2025 Hacked ATM Token. All rights reserved
                  </p>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};

export default Header;
