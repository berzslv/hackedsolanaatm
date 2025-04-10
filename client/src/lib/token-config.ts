// Solana token configuration
export const TOKEN_CONFIG = {
  // HackATM Token on Devnet
  mint: "12KQqSdN6WEuwo8ah1ykfUPAWME8Sy7XppgfFun4N1D5",
  authority: "2B99oKDqPZynTZzrH414tnxHWuf1vsDfcNaHGVzttQap",
  name: "Hacked ATM Token",
  symbol: "HATM",
  decimals: 9,
  logo: "/hatm-logo.png", // Will need to create this logo asset
  network: "devnet"
};

// Helper functions
export function getExplorerUrl(address: string, cluster = TOKEN_CONFIG.network): string {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}

export function getTokenExplorerUrl(): string {
  return getExplorerUrl(TOKEN_CONFIG.mint);
}

export function formatTokenAmount(amount: number): string {
  return (amount / Math.pow(10, TOKEN_CONFIG.decimals)).toFixed(2);
}

export function parseTokenAmount(amount: number): number {
  return amount * Math.pow(10, TOKEN_CONFIG.decimals);
}