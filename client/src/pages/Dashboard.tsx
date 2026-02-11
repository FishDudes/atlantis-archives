import { useAuth } from "@/hooks/use-auth";
import { useDocuments } from "@/hooks/use-documents";
import { Navigation } from "@/components/Navigation";
import { DocumentCard } from "@/components/DocumentCard";
import { CreateDocumentDialog } from "@/components/CreateDocumentDialog";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Filter } from "lucide-react";
import { useState } from "react";
import { CATEGORIES } from "@shared/schema";

export default function Dashboard() {
  const { user, isLoading: authLoading, isAdmin } = useAuth();

  const pathParts = window.location.pathname.split('/');
  const categoryFilter = pathParts[2];

  const [search, setSearch] = useState("");
  
  const { data: documents, isLoading } = useDocuments({
    search: search || undefined,
    category: categoryFilter,
    sortBy: "updated"
  });

  const getTitle = () => {
    if (!categoryFilter) return "All Archives";
    const cat = CATEGORIES.find(c => c.value === categoryFilter);
    return cat?.label || categoryFilter.charAt(0).toUpperCase() + categoryFilter.slice(1);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) {
    window.location.href = "/";
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex">
      <Navigation />
      
      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-background/80 backdrop-blur-md border-b border-white/5 flex flex-col md:flex-row gap-3 sm:gap-4 items-start md:items-center justify-between pl-14 sm:pl-4 lg:pl-8">
          <div>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground" data-testid="text-dashboard-title">{getTitle()}</h1>
            <p className="text-muted-foreground text-xs sm:text-sm mt-1">
              Welcome back, {user.discordUsername || user.firstName}. 
              {documents ? ` ${documents.length} records found.` : " Accessing database..."}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search archives..." 
                className="pl-9 bg-card/50 border-white/10 focus:border-primary/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-testid="input-search"
              />
            </div>
            <CreateDocumentDialog />
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 text-primary/50 animate-spin" />
            </div>
          ) : documents?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground border-2 border-dashed border-white/5 rounded-3xl bg-white/5">
              <Filter className="w-12 h-12 mb-4 opacity-20" />
              <p className="text-lg font-medium">No records found</p>
              <p className="text-sm opacity-60">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {documents?.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
