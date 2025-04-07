import { useTheme } from "@/context/ThemeContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className={cn("w-9 h-9 rounded-full", className)}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === "light" ? (
        <i className="ri-moon-line text-lg"></i>
      ) : (
        <i className="ri-sun-line text-lg"></i>
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}