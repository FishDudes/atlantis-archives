import { Link } from "wouter";
import { format } from "date-fns";
import { Shield, Scroll, Globe, Lock, Clock } from "lucide-react";
import { type DocumentResponse } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DocumentCardProps {
  document: DocumentResponse;
}

export function DocumentCard({ document }: DocumentCardProps) {
  // Determine icon based on category
  const getIcon = () => {
    switch (document.category) {
      case "intel": return <Shield className="w-5 h-5 text-red-400" />;
      case "diplomacy": return <Globe className="w-5 h-5 text-yellow-400" />;
      default: return <Scroll className="w-5 h-5 text-primary" />;
    }
  };

  const getCategoryColor = () => {
    switch (document.category) {
      case "intel": return "bg-red-500/10 text-red-400 border-red-500/20";
      case "diplomacy": return "bg-yellow-500/10 text-yellow-400 border-yellow-500/20";
      default: return "bg-primary/10 text-primary border-primary/20";
    }
  };

  return (
    <Link href={`/document/${document.id}`}>
      <div className="group relative h-full bg-card/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 hover:border-primary/30 hover:bg-card/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden">
        {/* Hover Gradient Effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-start justify-between mb-4">
            <div className={cn("p-2 rounded-lg border", getCategoryColor())}>
              {getIcon()}
            </div>
            {document.isPublic ? (
              <Globe className="w-4 h-4 text-muted-foreground/50" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground/50" />
            )}
          </div>

          <h3 className="font-display font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2">
            {document.title}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-6 line-clamp-3 flex-grow font-sans">
            {document.content.substring(0, 150)}...
          </p>

          <div className="flex items-center justify-between text-xs text-muted-foreground/70 pt-4 border-t border-white/5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(document.updatedAt), "MMM d, yyyy")}
            </span>
            <span className="capitalize px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
              {document.category}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
