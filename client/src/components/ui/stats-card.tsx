import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  color?: "primary" | "secondary" | "accent";
  className?: string;
}

export function StatsCard({ title, value, color = "primary", className }: StatsCardProps) {
  const colorClasses = {
    primary: "text-primary",
    secondary: "text-secondary",
    accent: "text-accent"
  };

  return (
    <div className={cn("bg-dark-800/60 backdrop-blur-sm p-4 rounded-lg border border-dark-600", className)}>
      <p className={cn("text-2xl font-display", colorClasses[color])}>{value}</p>
      <p className="text-light-300 text-sm">{title}</p>
    </div>
  );
}
