import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WalletNativePopupProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  content: React.ReactNode;
}

/**
 * A special popup for wallet browsers that uses native techniques
 * instead of Dialog components that may not render correctly
 */
export function WalletNativePopup({
  open,
  onOpenChange,
  title,
  content
}: WalletNativePopupProps) {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  
  // Create and append the container element
  useEffect(() => {
    if (!container) {
      const div = document.createElement('div');
      div.id = 'wallet-native-popup-container';
      div.style.display = 'none';
      div.style.position = 'fixed';
      div.style.top = '0';
      div.style.left = '0';
      div.style.width = '100vw';
      div.style.height = '100vh';
      div.style.backgroundColor = 'rgba(0, 0, 0, 0.75)';
      div.style.zIndex = '9999';
      div.style.overflowY = 'auto';
      div.style.padding = '1rem';
      
      document.body.appendChild(div);
      setContainer(div);
    }
    
    return () => {
      if (container) {
        document.body.removeChild(container);
      }
    };
  }, [container]);
  
  // Toggle visibility based on open state
  useEffect(() => {
    if (container) {
      container.style.display = open ? 'block' : 'none';
    }
  }, [open, container]);
  
  // Handle clicks on the container (close when clicking outside)
  useEffect(() => {
    const handleContainerClick = (e: MouseEvent) => {
      if (e.target === container) {
        onOpenChange(false);
      }
    };
    
    if (container) {
      container.addEventListener('click', handleContainerClick);
    }
    
    return () => {
      if (container) {
        container.removeEventListener('click', handleContainerClick);
      }
    };
  }, [container, onOpenChange]);
  
  // Only render content when open
  if (!open || !container) return null;
  
  // Use ReactDOM.createPortal to render into our container
  return createPortal(
    <div className="relative bg-card rounded-lg max-w-2xl mx-auto my-8 p-4 shadow-lg">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-xl font-bold">{title}</h2>
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => onOpenChange(false)}
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="min-h-[200px] max-h-[60vh] overflow-y-auto" 
           dangerouslySetInnerHTML={{ __html: typeof content === 'string' ? content : '' }}
      />
    </div>, 
    container
  );
}

// Helper function for using React portals in a more flexible way
function createPortal(children: React.ReactNode, container: Element) {
  // For SSR, just render null
  if (typeof document === 'undefined') return null;
  
  // Use any available createPortal implementation
  if (typeof React.createPortal === 'function') {
    return React.createPortal(children, container);
  }
  
  // Fallback to regular rendering if createPortal not available
  return children;
}