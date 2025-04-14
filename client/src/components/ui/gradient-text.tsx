import { cn } from "@/lib/utils";
import React from "react";

interface GradientTextProps {
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
}

export const GradientText = ({
  className,
  children,
  as: Component = "span",
}: GradientTextProps) => {
  return (
    <Component
      className={cn(
        "bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent",
        className
      )}
    >
      {children}
    </Component>
  );
};