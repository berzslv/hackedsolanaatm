import { useState, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useSolana } from '@/context/SolanaContext';
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
  
  const NavigationLink = ({ href, section, children }: { href: string, section: string, children: React.ReactNode }) => {
    const [location] = useLocation();
    const isHome = location === '/';
    const isActive = section === activeSection;
    
    // Base styles
    const linkStyles = cn(
      "transition-colors relative py-2",
      isActive 
        ? "text-primary font-medium" 
        : "text-foreground/70 hover:text-primary"
    );
    
    // Handle navigation differently based on location
    if (!isHome && href && href.startsWith('/#')) {
      // If we're not on home page, navigate to home with hash
      return (
        <Link href={href} className={linkStyles}>
          {children}
          {isActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>}
        </Link>
      );
    }
    
    // If on home page, use smooth scrolling
    return (
      <a 
        href={href ? href.replace('/#', '#') : '#'} 
        className={linkStyles}
        onClick={(e) => {
          if (isHome && href) {
            e.preventDefault();
            // Extract the ID from the href (remove /# or #)
            const id = href.replace('/#', '').replace('#', '');
            scrollToElement(id);
            setActiveSection(id);
            
            // Close mobile menu if open
            if (isMenuOpen) {
              setIsMenuOpen(false);
            }
          }
        }}
      >
        {children}
        {isActive && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary"></span>}
      </a>
    );
  };
  
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  return (
    <header className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-background/95 backdrop-blur-md z-50 border-b border-border shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center relative">
        {/* Header Pattern Elements */}
        <div className="absolute inset-0 overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/10 rounded-full"></div>
          <div className="absolute -left-12 -bottom-12 w-24 h-24 bg-secondary/10 rounded-full"></div>
          <div className="absolute left-1/3 top-1/2 w-3 h-3 bg-primary/20 rounded-full"></div>
          <div className="absolute right-1/4 bottom-1/4 w-2 h-2 bg-secondary/20 rounded-full"></div>
          <div className="absolute left-1/2 top-1/4 w-4 h-4 bg-accent/20 rounded-full"></div>
        </div>
        
        {/* Logo/Home link that scrolls to top when on homepage */}
        <a 
          href="/" 
          className="flex items-center gap-2 z-10"
          onClick={(e) => {
            if (location === '/') {
              e.preventDefault();
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setActiveSection('home');
            }
          }}
        >
          <div className="relative w-10 h-10 flex items-center justify-center bg-card rounded-full overflow-hidden">
            <i className="ri-bank-fill text-primary text-2xl"></i>
            <div className="absolute inset-0 animate-pulse-slow opacity-50 bg-gradient-to-r from-primary/20 to-secondary/20 rounded-full"></div>
          </div>
          <div className="flex flex-col">
            <span className="font-display text-xl text-foreground">Hacked<span className="text-primary">ATM</span></span>
            <span className="text-[10px] -mt-1 text-accent">DEVNET MODE</span>
          </div>
        </a>
        
        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center space-x-6 z-10">
          <NavigationLink href="/#home" section="home">Home</NavigationLink>
          <NavigationLink href="/#about" section="about">About</NavigationLink>
          <NavigationLink href="/#staking" section="staking">Staking</NavigationLink>
          <NavigationLink href="/#referral" section="referral">Referrals</NavigationLink>
          <NavigationLink href="/#leaderboard" section="leaderboard">Leaderboard</NavigationLink>
          <NavigationLink href="/#faq" section="faq">FAQ</NavigationLink>

          {/* Whitepaper as popup */}
          <button 
            onClick={() => setShowWhitepaper(true)} 
            className="text-foreground/70 hover:text-primary transition-colors"
          >
            Whitepaper
          </button>
          <WhitepaperDialog open={showWhitepaper} onOpenChange={setShowWhitepaper} />
        </nav>
        
        {/* Wallet + Mobile Menu Button */}
        <div className="flex items-center gap-3 z-10">
          <SolanaWalletButton />
          <button 
            className="lg:hidden text-foreground/80 hover:text-primary" 
            onClick={toggleMenu}
            aria-label="Toggle menu"
          >
            <i className={`text-xl ${isMenuOpen ? 'ri-close-line' : 'ri-menu-line'}`}></i>
          </button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {isMenuOpen && (
        <nav className="lg:hidden bg-card/95 backdrop-blur-sm border-b border-border max-h-[80vh] overflow-y-auto">
          <div className="container mx-auto px-4 py-3 flex flex-col space-y-4 relative">
            {/* Mobile Pattern Elements */}
            <div className="absolute inset-0 overflow-hidden opacity-10 pointer-events-none">
              <div className="absolute -right-6 -top-6 w-20 h-20 bg-primary/10 rounded-full"></div>
              <div className="absolute right-1/4 bottom-1/4 w-2 h-2 bg-secondary/20 rounded-full"></div>
            </div>
            
            <NavigationLink href="/#home" section="home">Home</NavigationLink>
            <NavigationLink href="/#about" section="about">About</NavigationLink>
            <NavigationLink href="/#staking" section="staking">Staking</NavigationLink>
            <NavigationLink href="/#referral" section="referral">Referrals</NavigationLink>
            <NavigationLink href="/#leaderboard" section="leaderboard">Leaderboard</NavigationLink>
            <NavigationLink href="/#faq" section="faq">FAQ</NavigationLink>

            <button 
              onClick={() => {
                setShowWhitepaper(true);
                setIsMenuOpen(false);
              }} 
              className="text-foreground/70 hover:text-primary py-2 transition-colors z-10 text-left w-full"
            >
              Whitepaper
            </button>
            
            {/* Mobile wallet button */}
            <div className="sm:hidden w-full z-10 py-2">
              <SolanaWalletButton className="w-full justify-center" />
            </div>
          </div>
        </nav>
      )}
    </header>
  );
};

export default Header;
