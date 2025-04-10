import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

// Create a context to share referral code across components
export type ReferralContextType = {
  referralCode: string | null;
  setReferralCode: (code: string | null) => void;
  referralFromLink: boolean;
  setReferralFromLink: (fromLink: boolean) => void;
  validateReferralCode: (code: string) => Promise<boolean>;
  // Add a new function to get a URL with the referral code appended
  getReferralUrl: () => string;
};

export const ReferralContext = createContext<ReferralContextType>({
  referralCode: null,
  setReferralCode: () => {},
  referralFromLink: false,
  setReferralFromLink: () => {},
  validateReferralCode: async () => false,
  getReferralUrl: () => window.location.origin,
});

export const useReferral = () => useContext(ReferralContext);

export const ReferralProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralFromLink, setReferralFromLink] = useState<boolean>(false);
  const [location] = useLocation();
  
  useEffect(() => {
    const checkReferralCode = async () => {
      // Parse URL parameters for referral code
      const params = new URLSearchParams(window.location.search);
      const codeFromUrl = params.get('ref');
      
      // Detect if we are inside a wallet's in-app browser
      const isInWalletBrowser = 
        window.navigator.userAgent.includes('SolflareWallet') || 
        window.navigator.userAgent.includes('PhantomWallet') ||
        document.referrer.includes('phantom') ||
        document.referrer.includes('solflare');
      
      // Check for a new referral code in the URL
      if (codeFromUrl) {
        try {
          const response = await fetch(`/api/validate-referral/${codeFromUrl}`);
          const data = await response.json();
          
          if (response.ok && data.valid) {
            console.log(`Referral code from URL is valid: ${codeFromUrl}`);
            setReferralCode(codeFromUrl);
            setReferralFromLink(true);
            
            // Store in session storage for persistence across page refreshes
            sessionStorage.setItem('referralCode', codeFromUrl);
            sessionStorage.setItem('referralFromLink', 'true');
            
            // Add a special flag for wallet browser detection
            if (isInWalletBrowser) {
              localStorage.setItem('walletReferralCode', codeFromUrl);
            }
          } else {
            console.error(`Invalid referral code in URL: ${codeFromUrl}`);
          }
        } catch (error) {
          console.error('Error validating referral code:', error);
        }
      } else {
        // No referral code in URL, try to restore from storage
        
        // If in wallet browser, try to use the special wallet referral code
        if (isInWalletBrowser) {
          const walletReferralCode = localStorage.getItem('walletReferralCode');
          if (walletReferralCode) {
            console.log('Restored referral code in wallet browser:', walletReferralCode);
            setReferralCode(walletReferralCode);
            setReferralFromLink(true);
            
            // Reattach the code to the URL to ensure it persists
            const currentUrl = new URL(window.location.href);
            currentUrl.searchParams.set('ref', walletReferralCode);
            window.history.replaceState({}, '', currentUrl.toString());
            return;
          }
        }
        
        // Otherwise, check regular session storage
        const storedCode = sessionStorage.getItem('referralCode');
        const storedFromLink = sessionStorage.getItem('referralFromLink');
        
        if (storedCode) {
          setReferralCode(storedCode);
          setReferralFromLink(storedFromLink === 'true');
          
          // If we're in a wallet browser and have a referral code but it's not in the URL,
          // reattach it to the URL
          if (isInWalletBrowser) {
            const currentUrl = new URL(window.location.href);
            if (!currentUrl.searchParams.has('ref')) {
              currentUrl.searchParams.set('ref', storedCode);
              window.history.replaceState({}, '', currentUrl.toString());
              console.log('Reattached referral code to URL in wallet browser:', storedCode);
            }
          }
        }
      }
    };

    checkReferralCode();
  }, [location]);
  
  const validateReferralCode = async (code: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/referrals/validate?code=${code}`);
      
      if (response.ok) {
        const data = await response.json();
        return data.valid;
      }
      
      return false;
    } catch (error) {
      console.error('Error validating referral code:', error);
      return false;
    }
  };
  
  // Function to get a URL with the current referral code appended
  const getReferralUrl = (): string => {
    // Get the base URL (protocol + hostname + port)
    const baseUrl = window.location.origin;
    
    // If we have a referral code, append it to the URL
    if (referralCode) {
      return `${baseUrl}/?ref=${referralCode}`;
    }
    
    // Otherwise just return the base URL
    return baseUrl;
  };
  
  return (
    <ReferralContext.Provider 
      value={{ 
        referralCode, 
        setReferralCode, 
        referralFromLink, 
        setReferralFromLink,
        validateReferralCode,
        getReferralUrl
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
};