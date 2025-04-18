import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(num: number, options: { decimals?: number, prefix?: string, suffix?: string } = {}) {
  const { decimals = 2, prefix = '', suffix = '' } = options;
  if (isNaN(num)) return `${prefix}0${suffix}`;
  
  return `${prefix}${num.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })}${suffix}`;
}

export function shortenAddress(address: string, chars = 4): string {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 10);
}

// Calculate time until next 30-min interval (in ms)
export function getTimeUntilNextDistribution(): number {
  const now = new Date();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const milliseconds = now.getMilliseconds();
  
  // Time to next 30-minute mark (0 or 30)
  const minutesToNext = minutes < 30 ? 30 - minutes : 60 - minutes;
  const timeToNext = (minutesToNext * 60 - seconds) * 1000 - milliseconds;
  
  return timeToNext;
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Unlocked';
  
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

export function formatAsPercent(num: number, options: { decimals?: number } = {}): string {
  const { decimals = 1 } = options;
  if (isNaN(num)) return '0%';
  
  return `${num.toFixed(decimals)}`;
}
