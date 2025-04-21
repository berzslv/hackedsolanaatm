/**
 * BN Browser Compatibility Module
 * 
 * This provides a more reliable way to use BN.js in the browser
 * by completely avoiding Buffer dependency issues.
 */

import { BN } from '@coral-xyz/anchor';

/**
 * Creates a BN object safely in the browser environment
 * This avoids Buffer by using string or number constructors
 */
export function createSafeBN(amount: number): BN {
  try {
    // For large numbers, always use string constructor
    // This is the most reliable approach in browsers
    return new BN(amount.toString());
  } catch (error) {
    console.error("Error creating BN, falling back to alternative:", error);
    
    // If that fails, try direct number (but this can overflow for large values)
    try {
      // This may overflow for large values, so only use for small amounts
      if (amount < 1000000) {
        return new BN(amount);
      } else {
        // Split the number to handle it better
        const billions = Math.floor(amount / 1000000000);
        const remainder = amount % 1000000000;
        
        if (billions > 0) {
          const billionBN = new BN(1000000000);
          return new BN(billions).mul(billionBN).add(new BN(remainder));
        } else {
          return new BN(amount);
        }
      }
    } catch (secondError) {
      console.error("All BN creation attempts failed:", secondError);
      throw new Error("Could not create BN value safely in browser");
    }
  }
}

/**
 * Convert a token amount to lamports amount as BN
 * Handles the conversion from regular token units to smallest units (lamports)
 */
export function tokenAmountToBN(amount: number, decimals: number = 9): BN {
  try {
    // Calculate raw amount
    const rawAmount = amount * Math.pow(10, decimals);
    
    // Convert to integer
    const integerAmount = Math.floor(rawAmount);
    
    // Create BN using string constructor (most reliable in browsers)
    return createSafeBN(integerAmount);
  } catch (error) {
    console.error("Error converting token amount to BN:", error);
    throw error;
  }
}

/**
 * Diagnostic function to test BN functionality in current environment
 */
export function testBNFunctionality(): {success: boolean, details: string} {
  try {
    // Test 1: Basic creation and toString
    const num1 = new BN(123);
    if (num1.toString() !== '123') {
      return {
        success: false,
        details: `BN creation failed: ${num1.toString()} !== 123`
      };
    }
    
    // Test 2: String constructor
    const num2 = new BN('456');
    if (num2.toString() !== '456') {
      return {
        success: false,
        details: `BN string constructor failed: ${num2.toString()} !== 456`
      };
    }
    
    // Test 3: Addition
    const sum = num1.add(num2);
    if (sum.toString() !== '579') {
      return {
        success: false,
        details: `BN addition failed: ${sum.toString()} !== 579`
      };
    }
    
    // Test 4: Our safe creation function
    const safeNum = createSafeBN(789);
    if (safeNum.toString() !== '789') {
      return {
        success: false,
        details: `createSafeBN failed: ${safeNum.toString()} !== 789`
      };
    }
    
    // Test 5: Large number
    const largeNum = createSafeBN(1000000000);
    if (largeNum.toString() !== '1000000000') {
      return {
        success: false,
        details: `createSafeBN for large number failed: ${largeNum.toString()} !== 1000000000`
      };
    }
    
    // Test 6: Token amount conversion
    const tokenAmount = tokenAmountToBN(1.5);
    if (tokenAmount.toString() !== '1500000000') {
      return {
        success: false,
        details: `tokenAmountToBN failed: ${tokenAmount.toString()} !== 1500000000`
      };
    }
    
    return {
      success: true,
      details: 'All BN tests passed successfully'
    };
  } catch (error) {
    return {
      success: false,
      details: `BN test failed with error: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}