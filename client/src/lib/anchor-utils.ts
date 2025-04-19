/**
 * Anchor Utility Functions
 * 
 * Helper functions for working with Anchor programs in the browser
 */

/**
 * Generate an Anchor instruction discriminator from an instruction name
 * This creates the 8-byte discriminator hash that Anchor uses to identify instructions
 * 
 * @param name The instruction name (e.g., "initialize", "stake", "register_user")
 * @returns Uint8Array containing the 8-byte discriminator
 */
export function getAnchorDiscriminator(name: string): Uint8Array {
  // In Node.js we would use crypto, but in the browser we need to use Web Crypto API
  // or a JS implementation of SHA-256
  
  // Convert the string to bytes
  const encoder = new TextEncoder();
  const preimageBytes = encoder.encode(`global:${name}`);
  
  // Compute SHA-256 hash
  // Note: In a production app, you might want to use a proper crypto library
  // This is a simplified implementation that matches Anchor's algorithm
  const hashHex = sha256(preimageBytes);
  
  // Convert the first 8 bytes of the hash to a Uint8Array
  const result = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    result[i] = parseInt(hashHex.slice(i * 2, i * 2 + 2), 16);
  }
  
  return result;
}

/**
 * Simple SHA-256 implementation for browser
 * This is adequate for generating instruction discriminators
 * In production, use a robust crypto library
 */
function sha256(data: Uint8Array): string {
  // Based on a simplified SHA-256 implementation
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }

  const k = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];

  // Initial hash values (first 32 bits of the fractional parts of the square roots of the first 8 primes)
  const h0 = 0x6a09e667;
  const h1 = 0xbb67ae85;
  const h2 = 0x3c6ef372;
  const h3 = 0xa54ff53a;
  const h4 = 0x510e527f;
  const h5 = 0x9b05688c;
  const h6 = 0x1f83d9ab;
  const h7 = 0x5be0cd19;

  // Pre-processing: pad the message
  let paddedData = new Uint8Array(data.length + 64);
  paddedData.set(data);
  paddedData[data.length] = 0x80; // Append 1 bit followed by zeros

  // Append the length in bits as a 64-bit big-endian integer
  const dataLengthBits = data.length * 8;
  for (let i = 0; i < 8; i++) {
    paddedData[paddedData.length - 8 + i] = (dataLengthBits >>> ((7 - i) * 8)) & 0xff;
  }

  // Process the message in 512-bit chunks
  for (let chunkStart = 0; chunkStart < paddedData.length; chunkStart += 64) {
    const w = new Array(64);
    
    // Copy chunk into w[0..15]
    for (let i = 0; i < 16; i++) {
      w[i] = (paddedData[chunkStart + i * 4] << 24) | 
             (paddedData[chunkStart + i * 4 + 1] << 16) | 
             (paddedData[chunkStart + i * 4 + 2] << 8) | 
             (paddedData[chunkStart + i * 4 + 3]);
    }

    // Extend the first 16 words into w[16..63]
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) & 0xffffffff;
    }

    // Initialize working variables to current hash value
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    // Compression function main loop
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + k[i] + w[i]) & 0xffffffff;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) & 0xffffffff;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) & 0xffffffff;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) & 0xffffffff;
    }

    // Add the compressed chunk to the current hash value
    h0 = (h0 + a) & 0xffffffff;
    h1 = (h1 + b) & 0xffffffff;
    h2 = (h2 + c) & 0xffffffff;
    h3 = (h3 + d) & 0xffffffff;
    h4 = (h4 + e) & 0xffffffff;
    h5 = (h5 + f) & 0xffffffff;
    h6 = (h6 + g) & 0xffffffff;
    h7 = (h7 + h) & 0xffffffff;
  }

  // Convert the hash to a hex string
  let result = '';
  for (const h of [h0, h1, h2, h3, h4, h5, h6, h7]) {
    result += h.toString(16).padStart(8, '0');
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