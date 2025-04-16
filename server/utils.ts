/**
 * Utility functions for the Solana blockchain interaction
 */

/**
 * Get a WebSocket URL for RPC connection
 * @returns WebSocket URL
 */
export function getWebsocketConnection(): string {
  // Use Solana's default devnet WebSocket endpoint
  return 'wss://devnet.solana.com';
}