import { useDocument, useDeleteDocument } from "@/hooks/use-documents";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { Navigation } from "@/components/Navigation";
import { EditDocumentDialog } from "@/components/EditDocumentDialog";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Trash2, Calendar, Tag, Copy, Check } from "lucide-react";
import { format } from "date-fns";
import { CATEGORIES } from "@shared/schema";
import { useEffect, useRef, useState, useCallback } from "react";
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
  const { user, isAdmin } = useAuth();
  const deleteDocument = useDeleteDocument();
  const [, setLocation] = useLocation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Inject copy buttons into every blockquote after content renders
  const injectCopyButtons = useCallback(() => {
    if (!contentRef.current) return;
    const blockquotes = contentRef.current.querySelectorAll("blockquote");
    blockquotes.forEach((bq, idx) => {
      if (bq.querySelector("[data-quote-copy]")) return; // already injected

      // Make blockquote a positioning context
      (bq as HTMLElement).style.position = "relative";

      const btn = window.document.createElement("button");
      btn.setAttribute("data-quote-copy", String(idx));
      btn.setAttribute("title", "Copy quote");
      btn.setAttribute("data-testid", `button-copy-quote-${idx}`);
      btn.style.cssText = `
        position: absolute;
        top: 8px;
        right: 8px;
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 3px 8px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.12);
        background: rgba(255,255,255,0.06);
        color: rgba(255,255,255,0.5);
        font-size: 11px;
        font-family: inherit;
        cursor: pointer;
        transition: background 0.15s, color 0.15s, border-color 0.15s;
      `;
      btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Copy</span>`;

      btn.onmouseenter = () => {
        btn.style.background = "rgba(255,255,255,0.12)";
        btn.style.color = "rgba(255,255,255,0.9)";
        btn.style.borderColor = "rgba(255,255,255,0.25)";
      };
      btn.onmouseleave = () => {
        if (!btn.getAttribute("data-copied")) {
          btn.style.background = "rgba(255,255,255,0.06)";
          btn.style.color = "rgba(255,255,255,0.5)";
          btn.style.borderColor = "rgba(255,255,255,0.12)";
        }
      };

      btn.onclick = async () => {
        const text = bq.textContent?.trim() || "";
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          // Fallback for older browsers
          const ta = window.document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          window.document.body.appendChild(ta);
          ta.select();
          window.document.execCommand("copy");
          window.document.body.removeChild(ta);
        }
        // Show feedback
        btn.setAttribute("data-copied", "1");
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg><span>Copied!</span>`;
        btn.style.background = "rgba(34,197,94,0.12)";
        btn.style.color = "rgb(134,239,172)";
        btn.style.borderColor = "rgba(34,197,94,0.3)";
        setTimeout(() => {
          btn.removeAttribute("data-copied");
          btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg><span>Copy</span>`;
          btn.style.background = "rgba(255,255,255,0.06)";
          btn.style.color = "rgba(255,255,255,0.5)";
          btn.style.borderColor = "rgba(255,255,255,0.12)";
        }, 2000);
      };

      bq.appendChild(btn);
    });
  }, []);

  useEffect(() => {
    if (document) injectCopyButtons();
  }, [document, injectCopyButtons]);

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
        <Button onClick={() => setLocation("/dashboard")} data-testid="button-return-dashboard">Return to Dashboard</Button>
      </div>
    );
  }

  const categoryLabel = CATEGORIES.find(c => c.value === document.category)?.label || document.category;

  const handleDelete = () => {
    deleteDocument.mutate(id, {
      onSuccess: () => setLocation("/dashboard"),
    });
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Navigation />

      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col relative">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[100px] pointer-events-none" />

        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 border-b border-white/5 flex items-center justify-between bg-background/50 backdrop-blur sticky top-0 z-20 pl-14 sm:pl-4 lg:pl-8">
          <Button
            variant="ghost"
            className="text-muted-foreground"
            onClick={() => window.history.back()}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Back</span>
          </Button>

          <div className="flex items-center gap-2">
            {isAdmin && (
              <>
                <EditDocumentDialog document={document} />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-destructive/30 text-destructive" data-testid="button-delete-document">
                      <Trash2 className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Delete</span>
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
                      <AlertDialogCancel className="border-white/10">Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDelete}
                        className="bg-destructive text-destructive-foreground"
                        data-testid="button-confirm-delete"
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

        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto w-full">
          <article className="space-y-6 sm:space-y-8">
            <header className="space-y-3 sm:space-y-4 pb-6 sm:pb-8 border-b border-white/10">
              <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                  <Tag className="w-3 h-3" /> {categoryLabel}
                </span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> {format(new Date(document.createdAt), "MMMM d, yyyy")}
                </span>
              </div>

              <h1 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold leading-tight text-foreground" data-testid="text-document-title">
                {document.title}
              </h1>
            </header>

            <div
              ref={contentRef}
              className="prose prose-invert prose-lg max-w-none prose-headings:font-display prose-headings:text-primary prose-a:text-accent prose-blockquote:border-l-primary prose-blockquote:bg-white/5 prose-blockquote:p-4 prose-blockquote:rounded-r-lg prose-p:text-foreground/90 prose-li:text-foreground/90 prose-strong:text-foreground font-serif text-lg leading-relaxed"
              data-testid="text-document-content"
              dangerouslySetInnerHTML={{ __html: document.content }}
            />
          </article>
        </div>
      </main>
    </div>
  );
}
