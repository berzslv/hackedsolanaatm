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

// Compute actual discriminators for the simple_staking program
export const SIMPLE_STAKING_DISCRIMINATORS = {
  initialize: getAnchorDiscriminator("initialize"),
  registerUser: getAnchorDiscriminator("registerUser"),
  stake: getAnchorDiscriminator("stake"),
  unstake: getAnchorDiscriminator("unstake")
};

// Log the discriminators for debugging
console.log("Anchor discriminators generated:");
console.log("initialize:", Array.from(SIMPLE_STAKING_DISCRIMINATORS.initialize).map(b => b.toString()).join(','));
console.log("registerUser:", Array.from(SIMPLE_STAKING_DISCRIMINATORS.registerUser).map(b => b.toString()).join(','));
console.log("stake:", Array.from(SIMPLE_STAKING_DISCRIMINATORS.stake).map(b => b.toString()).join(','));