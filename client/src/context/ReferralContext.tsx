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
      // Basic validation before making API call
      if (!code || code.trim() === '') {
        return false;
      }
      
      // Solana wallet addresses are 32-44 characters
      // Legacy codes are 3-10 characters
      // Allow all formats to be validated by the server
      console.log(`Validating referral code: ${code}`);
      
      // Implement retry logic for blockchain connection issues
      let retries = 3;
      let success = false;
      let result = false;
      
      while (retries > 0 && !success) {
        try {
          const response = await fetch(`/api/validate-referral/${code}`);
          success = true;
          
          if (response.ok) {
            const data = await response.json();
            console.log('Referral validation response:', data);
            
            // If valid, also save to context and session storage
            if (data.valid) {
              setReferralCode(code);
              setReferralFromLink(false);
              result = true;
            } else {
              result = false;
            }
          } else {
            console.log(`Referral validation failed with status: ${response.status}`);
            result = false;
          }
        } catch (retryError) {
          console.warn(`Retry attempt ${3 - retries + 1} failed:`, retryError);
          retries--;
          if (retries > 0) {
            console.log(`Retrying validation in 1 second... (${retries} attempts left)`);
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error validating referral code:", error);
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