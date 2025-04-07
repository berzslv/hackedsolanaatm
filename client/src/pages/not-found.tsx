import { Link } from "wouter";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { AlertCircle, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-border/30 shadow-xl overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-primary via-secondary to-accent"></div>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
              <AlertCircle className="h-10 w-10 text-red-500" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">404 Not Found</h1>
            <p className="text-foreground/70">
              The page you are looking for doesn't exist or has been moved.
            </p>
          </div>
          
          <div className="bg-muted p-4 rounded-lg mb-4 text-sm text-foreground/80">
            <p className="flex items-center gap-2">
              <i className="ri-information-line text-primary"></i>
              Looking for the Hacked ATM token? You're in the right place, but we couldn't find this specific page.
            </p>
          </div>
        </CardContent>
        
        <CardFooter className="flex justify-center pb-6">
          <Link href="/">
            <Button className="gradient-button flex items-center gap-2">
              <Home className="h-4 w-4" />
              Back to Homepage
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
