import { Link } from "wouter";
import { format } from "date-fns";
import { Shield, Scroll, Globe, Lock, Clock, BookOpen, Users, Briefcase, Swords, Coins, Cpu, Footprints } from "lucide-react";
import { type DocumentResponse, CATEGORIES } from "@shared/schema";
import { cn } from "@/lib/utils";

interface DocumentCardProps {
  document: DocumentResponse;
}

const categoryConfig: Record<string, { icon: any; color: string }> = {
  "intel": { icon: Shield, color: "bg-red-500/10 text-red-400 border-red-500/20" },
  "internal-affairs": { icon: Briefcase, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  "foreign-affairs": { icon: Globe, color: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20" },
  "military": { icon: Swords, color: "bg-orange-500/10 text-orange-400 border-orange-500/20" },
  "economy": { icon: Coins, color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  "technology": { icon: Cpu, color: "bg-violet-500/10 text-violet-400 border-violet-500/20" },
  "guidelines": { icon: BookOpen, color: "bg-primary/10 text-primary border-primary/20" },
  "new-players": { icon: Users, color: "bg-sky-500/10 text-sky-400 border-sky-500/20" },
  "first-steps": { icon: Footprints, color: "bg-teal-500/10 text-teal-400 border-teal-500/20" },
};

export function DocumentCard({ document }: DocumentCardProps) {
  const config = categoryConfig[document.category] || { icon: Scroll, color: "bg-primary/10 text-primary border-primary/20" };
  const IconComponent = config.icon;
  const categoryLabel = CATEGORIES.find(c => c.value === document.category)?.label || document.category;

  return (
    <Link href={`/document/${document.id}`}>
      <div 
        className="group relative h-full bg-card/40 backdrop-blur-sm border border-white/5 rounded-2xl p-6 hover:border-primary/30 hover:bg-card/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl cursor-pointer overflow-hidden"
        data-testid={`card-document-${document.id}`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-start justify-between gap-1 mb-4">
            <div className={cn("p-2 rounded-lg border", config.color)}>
              <IconComponent className="w-5 h-5" />
            </div>
            {document.isPublic ? (
              <Globe className="w-4 h-4 text-muted-foreground/50" />
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground/50" />
            )}
          </div>

          <h3 className="font-display font-bold text-lg text-foreground mb-2 group-hover:text-primary transition-colors line-clamp-2" data-testid={`text-document-title-${document.id}`}>
            {document.title}
          </h3>
          
          <p className="text-sm text-muted-foreground mb-6 line-clamp-3 flex-grow font-sans">
            {document.content.substring(0, 150)}...
          </p>

          <div className="flex items-center justify-between gap-1 text-xs text-muted-foreground/70 pt-4 border-t border-white/5">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {format(new Date(document.updatedAt), "MMM d, yyyy")}
            </span>
            <span className="capitalize px-2 py-0.5 rounded-full bg-white/5 border border-white/5 truncate max-w-[120px]">
              {categoryLabel}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
