/**
 * Anchor Utility Functions
 * 
 * Helper functions for working with Anchor programs in the browser
 */
import * as CryptoJS from 'crypto-js';

/**
 * Generate an Anchor instruction discriminator from an instruction name
 * This creates the 8-byte discriminator hash that Anchor uses to identify instructions
 * 
 * @param name The instruction name (e.g., "initialize", "stake", "registerUser")
 * @returns Uint8Array containing the 8-byte discriminator
 */
export function getAnchorDiscriminator(name: string): Uint8Array {
  // Anchor uses sha256("global:" + name) and takes the first 8 bytes
  const preimage = `global:${name}`;
  
  // Use CryptoJS for reliable hashing
  const hash = CryptoJS.SHA256(preimage).toString(CryptoJS.enc.Hex);
  
  // Convert the first 8 bytes of the hash to a Uint8Array
  const result = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    result[i] = parseInt(hash.slice(i * 2, i * 2 + 2), 16);
  }
  
  return result;
}

// Hard-coded discriminators that match the Anchor program's expected values
// These values were extracted from the Solana program logs during transaction simulation
export const SIMPLE_STAKING_DISCRIMINATORS = {
  // These discriminators have been manually identified from the program logs
  initialize: new Uint8Array([175, 175, 109, 31, 13, 152, 155, 237]),
  // Trying different cases for register_user as Anchor might be using snake_case internally
  registerUser: new Uint8Array([109, 19, 167, 111, 254, 155, 195, 112]), // from server log
  register_user: new Uint8Array([211, 98, 31, 68, 233, 45, 108, 189]), // from previous attempts
  // Trying different cases for stake
  stake: new Uint8Array([69, 119, 235, 219, 182, 124, 161, 6]), // from previous attempts
  unstake: new Uint8Array([21, 158, 66, 239, 67, 25, 98, 48]) // from previous attempts
};

// Log the discriminators for debugging
console.log("Anchor discriminators generated:");
console.log("initialize:", Array.from(SIMPLE_STAKING_DISCRIMINATORS.initialize).map(b => b.toString()).join(','));
console.log("registerUser:", Array.from(SIMPLE_STAKING_DISCRIMINATORS.registerUser).map(b => b.toString()).join(','));
console.log("stake:", Array.from(SIMPLE_STAKING_DISCRIMINATORS.stake).map(b => b.toString()).join(','));