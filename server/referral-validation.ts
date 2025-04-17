/**
 * Referral Validation Module
 * 
 * This module provides functions to validate referral codes using direct blockchain queries
 * instead of relying on a hardcoded whitelist
 */
import { Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { isValidReferrerOnChain } from './direct-staking-utils';

/**
 * Validate a referral code by checking if it corresponds to a registered wallet on-chain
 * @param req Express request with referral code as parameter
 * @param res Express response
 */
export async function validateReferralCode(req: Request, res: Response) {
  try {
    const code = req.params.code;
    
    if (!code) {
      return res.status(400).json({ 
        valid: false, 
        message: "Referral code is required" 
      });
    }
    
    console.log(`Validating referral code: ${code}`);
    
    // Try different formats for better user experience
    let isValid = false;
    let formattedCode = code;
    
    try {
      // First attempt - original case (most direct)
      // This is the first attempt because if the code is already a valid public key in its original form,
      // we should use it exactly as provided
      try {
        const pubkey = new PublicKey(code);
        
        // Check if this wallet is registered on-chain
        isValid = await isValidReferrerOnChain(code);
        
        if (isValid) {
          console.log(`Valid referrer found on-chain (original): ${code}`);
          return res.json({ 
            valid: true, 
            message: "Valid referral code verified on blockchain" 
          });
        }
      } catch (e1) {
        console.log(`Original key format failed: ${e1.message || 'Unknown error'}`);
        
        // Second attempt - try with normalized case (lowercase)
        try {
          const normalizedCode = code.toLowerCase();
          const pubkey = new PublicKey(normalizedCode);
          
          // Check if this wallet is registered on-chain
          isValid = await isValidReferrerOnChain(normalizedCode);
          formattedCode = normalizedCode;
          
          if (isValid) {
            console.log(`Valid referrer found on-chain (lowercase): ${normalizedCode}`);
            return res.json({ 
              valid: true, 
              message: "Valid referral code verified on blockchain" 
            });
          }
        } catch (e2) {
          console.log(`Lowercase key format failed: ${e2.message || 'Unknown error'}`);
          
          // Third attempt - try with uppercase
          try {
            const upperCode = code.toUpperCase();
            const pubkey = new PublicKey(upperCode);
            
            // Check if this wallet is registered on-chain
            isValid = await isValidReferrerOnChain(upperCode);
            formattedCode = upperCode;
            
            if (isValid) {
              console.log(`Valid referrer found on-chain (uppercase): ${upperCode}`);
              return res.json({ 
                valid: true, 
                message: "Valid referral code verified on blockchain" 
              });
            }
          } catch (e3) {
            console.log(`Uppercase key format failed: ${e3.message || 'Unknown error'}`);
            
            // Last attempt - try common character substitutions
            try {
              // Some common substitutions/fixes
              const fixedCode = code
                .replace(/O/g, '0')  // Replace O with 0
                .replace(/l/g, '1')  // Replace l with 1
                .replace(/I/g, '1'); // Replace I with 1
                
              const pubkey = new PublicKey(fixedCode);
              
              // Check if this wallet is registered on-chain
              isValid = await isValidReferrerOnChain(fixedCode);
              formattedCode = fixedCode;
              
              if (isValid) {
                console.log(`Valid referrer found on-chain after fixes: ${fixedCode}`);
                return res.json({ 
                  valid: true, 
                  message: "Valid referral code verified on blockchain" 
                });
              }
            } catch (e4) {
              // None of our attempts worked to find a valid key
              console.log(`Not a valid wallet address after multiple attempts: ${code}`);
            }
          }
        }
      }
    } catch (addressErr) {
      console.error("Error validating wallet address format:", addressErr);
    }
    
    // If we get here, we've tried all formats and none matched an on-chain registered user
    console.log(`No valid referrer found on-chain for code: ${code}`);
    
    // Also check for legacy code format as a fallback
    // For demonstration purposes, we'll be more strict: only accept codes we know are valid
    const validLegacyCodes = ["HATM001", "DEVTEST", "LAUNCH25"];
    const isLegacyValid = validLegacyCodes.includes(code);
    
    if (isLegacyValid) {
      console.log(`Valid legacy referral code: ${code}`);
      return res.json({ 
        valid: true, 
        message: "Valid legacy referral code" 
      });
    }
    
    // Return invalid result
    return res.json({ 
      valid: false, 
      message: "Invalid referral code - not registered on blockchain" 
    });
  } catch (error) {
    console.error("Error in referral validation:", error);
    return res.status(500).json({ 
      valid: false, 
      message: "Failed to validate referral code",
      details: error instanceof Error ? error.message : String(error)
    });
  }
}