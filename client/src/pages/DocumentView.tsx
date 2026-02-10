import { useDocument, useDeleteDocument } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { EditDocumentDialog } from "@/components/EditDocumentDialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Trash2, Calendar, User as UserIcon, Tag } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Props {
  id: number;
}

export default function DocumentView({ id }: Props) {
  const { data: document, isLoading } = useDocument(id);
  const { user } = useAuth();
  const deleteDocument = useDeleteDocument();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
        <h1 className="text-2xl font-display text-destructive">Document Not Found</h1>
        <Button onClick={() => setLocation("/dashboard")}>Return to Dashboard</Button>
      </div>
    );
  }

  const isAuthor = user?.id === document.authorId;

  const handleDelete = () => {
    deleteDocument.mutate(id, {
      onSuccess: () => setLocation("/dashboard"),
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Navigation />

      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col relative">
        {/* Background Accent */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        {/* Header / Actions */}
        <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-background/50 backdrop-blur sticky top-0 z-20">
          <Button 
            variant="ghost" 
            className="hover:bg-white/5 text-muted-foreground hover:text-foreground"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>

          <div className="flex items-center gap-2">
            {isAuthor && (
              <>
                <EditDocumentDialog document={document} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-destructive/30 text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4 mr-2" /> Delete
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-card border-white/10 text-card-foreground">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete the document from the archives.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-white/10 hover:bg-white/5">Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete}
                        className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 p-8 max-w-4xl mx-auto w-full">
          <article className="space-y-8">
            <header className="space-y-4 pb-8 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 capitalize">
                  <Tag className="w-3 h-3" /> {document.category}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> {format(new Date(document.createdAt), "MMMM d, yyyy")}
                </span>
                <span className="flex items-center gap-1.5 ml-auto">
                  <UserIcon className="w-3 h-3" /> Author ID: {document.authorId.substring(0, 8)}...
                </span>
              </div>
              
              <h1 className="text-4xl md:text-5xl font-display font-bold leading-tight text-foreground">
                {document.title}
              </h1>
            </header>

            <div className="prose prose-invert prose-lg max-w-none prose-headings:font-display prose-headings:text-primary prose-a:text-accent prose-blockquote:border-l-primary prose-blockquote:bg-white/5 prose-blockquote:p-4 prose-blockquote:rounded-r-lg">
              {/* 
                 In a real app, use a markdown renderer or HTML sanitizer here.
                 For now, we render text with simple line breaks preservation 
              */}
              <div className="whitespace-pre-wrap font-serif text-lg leading-relaxed text-foreground/90">
                {document.content}
              </div>
            </div>
          </article>
        </div>
      </main>
    </div>
  );
}
