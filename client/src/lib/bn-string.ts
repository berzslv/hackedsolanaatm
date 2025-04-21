/**
 * BN String Operations
 * 
 * This module provides helper functions to work with BN.js in browser environments
 * without relying on Buffer. This is a simplified approach that uses string operations.
 */

import { BN } from '@coral-xyz/anchor';

/**
 * Creates a BN object from a number or string, safely for browser environments
 * @param amount The amount to convert to BN
 * @returns A BN instance representing the amount
 */
export function safeBN(amount: number | string): BN {
  // Always use string constructor for maximum compatibility
  return new BN(amount.toString());
}

/**
 * Converts a token amount with decimals to a BN object representing lamports
 * @param amount The token amount (e.g., 1.5 tokens)
 * @param decimals The number of decimal places (9 for SOL and most SPL tokens)
 * @returns A BN instance representing the lamports amount
 */
export function tokenToLamports(amount: number, decimals: number = 9): BN {
  // Calculate the raw amount with decimal precision
  const rawAmount = amount * Math.pow(10, decimals);
  
  // Convert to integer to avoid floating point issues
  const integerAmount = Math.floor(rawAmount);
  
  // Create a BN using string constructor for browser compatibility
  return safeBN(integerAmount.toString());
}

/**
 * Converts lamports (BN) back to a token amount
 * @param lamports BN representing lamports
 * @param decimals Number of decimal places (9 for SOL and most SPL tokens)
 * @returns Token amount as a number
 */
export function lamportsToToken(lamports: BN, decimals: number = 9): number {
  const divisor = Math.pow(10, decimals);
  return Number(lamports.toString()) / divisor;
}