import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// This component is kept for compatibility but doesn't actually toggle themes anymore
// as we've removed light mode support
interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  // Always in dark mode
  return (
    <Button
      variant="outline"
      size="icon"
      // No-op function
      onClick={() => console.log("Dark mode only - theme toggle disabled")}
      className={cn("w-9 h-9 rounded-full", className)}
      title="Dark mode only"
    >
      <i className="ri-sun-line text-lg"></i>
      <span className="sr-only">Dark mode enabled</span>
    </Button>
  );
}