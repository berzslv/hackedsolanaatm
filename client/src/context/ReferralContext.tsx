import { createContext, useContext, useState, useEffect } from 'react';
import { useLocation } from 'wouter';

// Create a context to share referral code across components
export type ReferralContextType = {
  referralCode: string | null;
  setReferralCode: (code: string | null) => void;
  referralFromLink: boolean;
  setReferralFromLink: (fromLink: boolean) => void;
  validateReferralCode: (code: string) => Promise<boolean>;
};

export const ReferralContext = createContext<ReferralContextType>({
  referralCode: null,
  setReferralCode: () => {},
  referralFromLink: false,
  setReferralFromLink: () => {},
  validateReferralCode: async () => false,
});

export const useReferral = () => useContext(ReferralContext);

export const ReferralProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [referralCode, setReferralCode] = useState<string | null>(null);
  const [referralFromLink, setReferralFromLink] = useState<boolean>(false);
  const [location] = useLocation();
  
  useEffect(() => {
    // Parse URL parameters for referral code
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('ref');
    
    if (codeFromUrl) {
      validateReferralCode(codeFromUrl).then(isValid => {
        if (isValid) {
          console.log(`Referral code from URL is valid: ${codeFromUrl}`);
          setReferralCode(codeFromUrl);
          setReferralFromLink(true);
          
          // Store in session storage for persistence across page refreshes
          sessionStorage.setItem('referralCode', codeFromUrl);
          sessionStorage.setItem('referralFromLink', 'true');
        } else {
          console.error(`Invalid referral code in URL: ${codeFromUrl}`);
        }
      });
    } else {
      // Check session storage for referral code
      const storedCode = sessionStorage.getItem('referralCode');
      const storedFromLink = sessionStorage.getItem('referralFromLink');
      
      if (storedCode) {
        setReferralCode(storedCode);
        setReferralFromLink(storedFromLink === 'true');
      }
    }
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
  
  return (
    <ReferralContext.Provider 
      value={{ 
        referralCode, 
        setReferralCode, 
        referralFromLink, 
        setReferralFromLink,
        validateReferralCode
      }}
    >
      {children}
    </ReferralContext.Provider>
  );
};