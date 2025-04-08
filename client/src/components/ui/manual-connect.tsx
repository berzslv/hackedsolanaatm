import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Copy, CheckCircle } from 'lucide-react';

export function ManualConnect() {
  const [copied, setCopied] = useState(false);
  const [step, setStep] = useState(1);
  
  // Use a very simple approach - just provide instructions to users
  const currentUrl = window.location.href;
  
  const handleCopy = () => {
    try {
      navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };
  
  const goToNextStep = () => {
    setStep(prev => Math.min(prev + 1, 3));
  };
  
  const goToPrevStep = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };
  
  return (
    <div className="space-y-4 p-4 border border-border rounded-lg bg-card">
      <h3 className="text-lg font-medium">Manual Connection Steps</h3>
      
      {step === 1 && (
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2 mt-0.5 flex-shrink-0">1</div>
            <p className="text-sm">
              Copy this website's URL (we'll paste it into your wallet app in the next step)
            </p>
          </div>
          
          <div className="relative flex items-center bg-muted rounded-md p-2 mt-1">
            <span className="text-xs text-muted-foreground truncate flex-1">{currentUrl}</span>
            <Button size="sm" variant="ghost" onClick={handleCopy} className="ml-2">
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          
          <Button className="w-full" onClick={goToNextStep}>
            Next Step
          </Button>
        </div>
      )}
      
      {step === 2 && (
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2 mt-0.5 flex-shrink-0">2</div>
            <p className="text-sm">
              Open your wallet app (Phantom, Solflare, etc.) on your mobile device
            </p>
          </div>
          
          <div className="p-3 bg-muted rounded-md">
            <ul className="text-sm space-y-2 list-disc pl-5">
              <li>Open the wallet app on your phone</li>
              <li>Look for a browser option, dApp browser, or similar feature in your wallet</li>
              <li>In Phantom, tap the globe icon at the bottom 🌐</li>
              <li>In Solflare, look for the "Browser" tab</li>
            </ul>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={goToPrevStep}>
              Previous
            </Button>
            <Button className="flex-1" onClick={goToNextStep}>
              Next Step
            </Button>
          </div>
        </div>
      )}
      
      {step === 3 && (
        <div className="space-y-3">
          <div className="flex items-start">
            <div className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center text-sm mr-2 mt-0.5 flex-shrink-0">3</div>
            <p className="text-sm">
              Paste the URL in your wallet's browser and connect
            </p>
          </div>
          
          <div className="p-3 bg-muted rounded-md">
            <ul className="text-sm space-y-2 list-disc pl-5">
              <li>Paste the URL in your wallet's browser address bar</li>
              <li>The website will load inside your wallet app</li>
              <li>Tap "Connect" to connect your wallet</li>
              <li>You'll be automatically authorized since you're already in the wallet app</li>
            </ul>
          </div>
          
          <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-md">
            <p className="text-amber-300 text-sm font-medium">Need help?</p>
            <p className="text-sm mt-1">If you're having trouble, you can try installing the wallet extension on desktop Chrome or Firefox instead.</p>
          </div>
          
          <Button variant="outline" className="w-full" onClick={goToPrevStep}>
            Previous Step
          </Button>
        </div>
      )}
    </div>
  );
}