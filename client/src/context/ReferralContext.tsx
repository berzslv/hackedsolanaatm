import { createContext, useContext, useState, useEffect } from 'react';

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
  
  useEffect(() => {
    // Check session storage for saved referral code
    const storedCode = sessionStorage.getItem('referralCode');
    const storedFromLink = sessionStorage.getItem('referralFromLink');
    
    if (storedCode) {
      setReferralCode(storedCode);
      setReferralFromLink(storedFromLink === 'true');
    }
  }, []);
  
  // Save to session storage when code changes
  useEffect(() => {
    if (referralCode) {
      sessionStorage.setItem('referralCode', referralCode);
      sessionStorage.setItem('referralFromLink', referralFromLink.toString());
    } else {
      sessionStorage.removeItem('referralCode');
      sessionStorage.removeItem('referralFromLink');
    }
  }, [referralCode, referralFromLink]);
  
  const validateReferralCode = async (code: string): Promise<boolean> => {
    try {
      // Make sure code is valid format before making API call
      if (!code || code.length !== 6) {
        return false;
      }
      
      const response = await fetch(`/api/validate-referral/${code}`);
      const data = await response.json();
      
      if (response.ok) {
        // If valid, also save to context and session storage
        if (data.valid) {
          setReferralCode(code);
          setReferralFromLink(false);
        }
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