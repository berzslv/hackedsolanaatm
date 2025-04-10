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
      
      console.log('Current browser environment:', {
        isInWalletBrowser,
        userAgent: window.navigator.userAgent,
        referrer: document.referrer,
        hasCodeFromUrl: !!codeFromUrl
      });
      
      // Check for a new referral code in the URL
      if (codeFromUrl) {
        try {
          const response = await fetch(`/api/validate-referral/${codeFromUrl}`);
          const data = await response.json();
          
          if (response.ok && data.valid) {
            console.log(`Referral code from URL is valid: ${codeFromUrl}`);
            setReferralCode(codeFromUrl);
            setReferralFromLink(true);
            
            // Store in both session and local storage for maximum persistence
            sessionStorage.setItem('referralCode', codeFromUrl);
            localStorage.setItem('referralCode', codeFromUrl);
            sessionStorage.setItem('referralFromLink', 'true');
            localStorage.setItem('referralFromLink', 'true');
            
            // Add a special flag for wallet browser detection
            localStorage.setItem('walletReferralCode', codeFromUrl);
          } else {
            console.error(`Invalid referral code in URL: ${codeFromUrl}`);
          }
        } catch (error) {
          console.error('Error validating referral code:', error);
        }
      } else {
        // No referral code in URL, try all storage options to restore one
        const walletReferralCode = localStorage.getItem('walletReferralCode');
        const localStorageCode = localStorage.getItem('referralCode');
        const sessionStorageCode = sessionStorage.getItem('referralCode');
        const finalCode = walletReferralCode || localStorageCode || sessionStorageCode;
        
        console.log('Attempting to restore referral code from storage:', {
          walletReferralCode,
          localStorageCode,
          sessionStorageCode,
          finalCode
        });
        
        if (finalCode) {
          console.log('Restored referral code from storage:', finalCode);
          setReferralCode(finalCode);
          setReferralFromLink(true);
          
          // Always reattach the code to URL for consistency
          const currentUrl = new URL(window.location.href);
          if (!currentUrl.searchParams.has('ref')) {
            currentUrl.searchParams.set('ref', finalCode);
            window.history.replaceState({}, '', currentUrl.toString());
            console.log('Reattached referral code to URL:', finalCode);
          }
        }
      }
    };

    // Run immediately and also after a short delay to catch any late initializations
    checkReferralCode();
    
    // Add a small delay for in-wallet browsers that might need time to fully initialize
    const delayedCheck = setTimeout(() => {
      // Only run the delayed check if we're in a wallet browser or just loaded the page
      const isInWalletBrowser = 
        window.navigator.userAgent.includes('SolflareWallet') || 
        window.navigator.userAgent.includes('PhantomWallet') ||
        document.referrer.includes('phantom') ||
        document.referrer.includes('solflare');
        
      if (isInWalletBrowser || location === '/') {
        console.log('Running delayed referral code check for wallet browser');
        checkReferralCode();
      }
    }, 1000);
    
    return () => clearTimeout(delayedCheck);
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