// This file now just re-exports BuyWidgetOnChain to maintain compatibility with existing imports
import BuyWidgetOnChain, { BuyWidgetProps } from './BuyWidgetOnChain';

// Re-export the component with the same interface
export default BuyWidgetOnChain;
export type { BuyWidgetProps };