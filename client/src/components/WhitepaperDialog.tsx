
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GradientText } from "@/components/ui/gradient-text";

interface WhitepaperDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const WhitepaperDialog = ({ open, onOpenChange }: WhitepaperDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh]">
        <ScrollArea className="h-full pr-4">
          <h1 className="text-4xl md:text-5xl font-display mb-6 text-foreground">
            <GradientText>Hacked ATM</GradientText> Whitepaper
          </h1>
          <p className="text-foreground/70 text-lg mb-8">
            A comprehensive guide to the Hacked ATM token ecosystem, staking mechanism, and referral system.
          </p>
          
          {/* Copy all the content divs from Whitepaper.tsx here, removing the container/wrapper divs */}
          <div className="space-y-8">
            <div className="bg-card/80 backdrop-blur-sm rounded-xl p-8 border border-border shadow-md">
              <h2 className="text-2xl font-display mb-6 text-foreground">Token Overview</h2>
              {/* Rest of the whitepaper content */}
            </div>
            {/* ... Copy all other sections from Whitepaper.tsx ... */}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default WhitepaperDialog;
