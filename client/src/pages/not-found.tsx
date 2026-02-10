import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background p-4">
      <div className="flex flex-col items-center text-center space-y-6 max-w-md">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center border border-destructive/20 animate-pulse">
          <AlertTriangle className="w-10 h-10 text-destructive" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-4xl font-display font-bold text-foreground">404 Lost at Sea</h1>
          <p className="text-muted-foreground">
            The coordinates you provided do not correspond to any known location in our archives.
          </p>
        </div>

        <Link href="/">
          <Button variant="outline" className="border-primary/50 text-primary hover:bg-primary/10 w-full sm:w-auto">
            Return to Surface
          </Button>
        </Link>
      </div>
    </div>
  );
}
