import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { 
  ScrollText, 
  ShieldAlert, 
  LayoutDashboard,
  LogOut,
  Menu,
  BookOpen,
  Users,
  Briefcase,
  Globe,
  Swords,
  Coins,
  Cpu,
  Footprints,
  RefreshCw,
  User,
  Download,
  Upload,
  MessageSquare,
} from "lucide-react";
import { useState, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import allianceLogo from "@assets/2D8435ED-5485-402E-88AA-FD17A14FF73E_1772670220046.png";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { CATEGORIES, CATEGORY_ROLE_ACCESS, DISCORD_ROLES } from "@shared/schema";

const categoryIcons: Record<string, any> = {
  "guidelines": BookOpen,
  "new-players": Users,
  "internal-affairs": Briefcase,
  "foreign-affairs": Globe,
  "military": Swords,
  "economy": Coins,
  "technology": Cpu,
  "first-steps": Footprints,
  "intel": ShieldAlert,
};

export function Navigation() {
  const [location] = useLocation();
  const { user, logout, userRoles, isAdmin, refreshRoles, isRefreshingRoles } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      const res = await fetch("/api/admin/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atlantis-archive-export-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Export successful", description: "Documents downloaded as JSON." });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.message || "Import failed");
      await queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({ title: "Import successful", description: result.message });
    } catch (err: any) {
      toast({ title: "Import failed", description: err.message, variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (importInputRef.current) importInputRef.current.value = "";
    }
  };

  const canAccessCategory = (categoryValue: string) => {
    if (isAdmin) return true;
    const allowedRoles = CATEGORY_ROLE_ACCESS[categoryValue];
    if (!allowedRoles) return true;
    return allowedRoles.some((r) => userRoles.includes(r));
  };

  const accessibleCategories = CATEGORIES.filter((cat) => canAccessCategory(cat.value));

  const navItems = [
    { name: "All Archives", href: "/dashboard", icon: LayoutDashboard },
    ...accessibleCategories.map((cat) => ({
      name: cat.label,
      href: `/dashboard/${cat.value}`,
      icon: categoryIcons[cat.value] || ScrollText,
    })),
    { name: "Query Archive", href: "/query", icon: MessageSquare },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard" && location === "/dashboard") return true;
    if (path !== "/dashboard" && location.startsWith(path)) return true;
    return false;
  };

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="py-6 px-6 mb-4 border-b border-white/10">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <img
            src={allianceLogo}
            alt="Atlantis Alliance Logo"
            className="w-10 h-10 rounded-lg object-cover shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-all duration-300"
            data-testid="img-nav-logo"
          />
          <div>
            <h1 className="font-display font-bold text-xl tracking-wider text-cyan-400 uppercase" data-testid="text-app-title">ATLANTIS ARCHIVES</h1>
          </div>
        </Link>
      </div>

      <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href);
          return (
            <Link key={item.name} href={item.href}>
              <div
                data-testid={`link-nav-${item.href.replace(/\//g, '-')}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer group",
                  active
                    ? "bg-primary/10 text-primary shadow-sm border border-primary/20"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                )}
                onClick={() => setIsOpen(false)}
              >
                <item.icon className={cn("w-4 h-4", active ? "text-primary" : "text-muted-foreground group-hover:text-primary transition-colors")} />
                <span className="font-medium text-sm">{item.name}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 mt-auto border-t border-white/10 bg-black/20">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10 border border-primary/20">
            <AvatarImage src={user?.profileImageUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {user?.firstName?.[0] || <User className="w-4 h-4" />}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate text-foreground" data-testid="text-username">{user?.discordUsername || user?.firstName || "Member"}</p>
            {isAdmin && (
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary mt-0.5">
                Admin
              </Badge>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => refreshRoles()}
            disabled={isRefreshingRoles}
            data-testid="button-refresh-roles"
          >
            <RefreshCw className={cn("w-4 h-4 text-muted-foreground", isRefreshingRoles && "animate-spin")} />
          </Button>
        </div>
        {isAdmin && (
          <div className="flex gap-2 mb-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-center text-muted-foreground border-white/10 text-xs"
              onClick={handleExport}
              data-testid="button-export-docs"
              title="Export all documents to JSON"
            >
              <Download className="w-3.5 h-3.5 mr-1" />
              Export
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 justify-center text-muted-foreground border-white/10 text-xs"
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
              data-testid="button-import-docs"
              title="Import documents from JSON"
            >
              <Upload className="w-3.5 h-3.5 mr-1" />
              {isImporting ? "Importing..." : "Import"}
            </Button>
            <input
              ref={importInputRef}
              type="file"
              accept=".json"
              className="hidden"
              onChange={handleImportFile}
            />
          </div>
        )}
        <Button 
          variant="outline" 
          className="w-full justify-start text-muted-foreground border-white/10"
          onClick={handleLogout}
          data-testid="button-sign-out"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button size="icon" variant="outline" className="bg-background/80 backdrop-blur border-primary/20 text-primary" data-testid="button-mobile-menu">
              <Menu className="w-5 h-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-80 bg-card border-r border-white/10">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      <aside className="hidden lg:block fixed top-0 left-0 h-screen w-72 bg-card/60 backdrop-blur-xl border-r border-white/10 shadow-2xl">
        <NavContent />
      </aside>
    </>
  );
}
