/**
 * Formatting utilities for display of data in the UI
 */

/**
 * Format a number for display
 * @param value The number to format
 * @param decimals Number of decimals to show
 * @returns Formatted number string
 */
export function formatNumber(value: number | string | null | undefined, decimals: number = 2): string {
  if (value === null || value === undefined) return '0';
  
  const num = typeof value === 'string' ? parseFloat(value) : value;
  
  if (isNaN(num)) return '0';
  
  // Format large numbers
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(decimals) + 'B';
  } else if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(decimals) + 'M';
  } else if (num >= 1_000) {
    return (num / 1_000).toFixed(decimals) + 'K';
  } else {
    return num.toFixed(decimals);
  }
}

/**
 * Format a date for display
 * @param date The date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date | null | undefined): string {
  if (!date) return 'N/A';
  
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  } catch (e) {
    console.error('Error formatting date:', e);
    return 'Invalid Date';
  }
}

/**
 * Abbreviate a Solana address
 * @param address Full Solana address
 * @param startChars Characters to show at the start
 * @param endChars Characters to show at the end
 * @returns Abbreviated address
 */
export function abbreviateAddress(address: string, startChars: number = 4, endChars: number = 4): string {
  if (!address) return '';
  if (address.length <= startChars + endChars) return address;
  
  return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
}