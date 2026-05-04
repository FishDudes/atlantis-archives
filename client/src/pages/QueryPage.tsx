import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Search, MessageSquare, BookOpen, TriangleAlert, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface Source {
  id: number;
  title: string;
}

interface Message {
  type: "user" | "answer" | "error";
  text: string;
  sources?: Source[];
}

export default function QueryPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "Atlantis Assistant";
    return () => { document.title = "Atlantis Archive"; };
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const handleQuery = async () => {
    const q = question.trim();
    if (!q || isQuerying) return;

    setMessages((prev) => [...prev, { type: "user", text: q }]);
    setQuestion("");
    setIsQuerying(true);

    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Query failed");
      setMessages((prev) => [
        ...prev,
        { type: "answer", text: data.answer, sources: data.sources },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { type: "error", text: err.message || "Something went wrong." },
      ]);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      <Navigation />

      <main className="flex-1 lg:ml-72 min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 px-4 sm:px-6 lg:px-8 py-4 sm:py-6 bg-background/80 backdrop-blur-md border-b border-white/5 pl-14 sm:pl-4 lg:pl-8">
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-foreground">
            Atlantis Assistant
          </h1>
          <p className="text-muted-foreground text-xs sm:text-sm mt-1">
            Ask a question and the assistant will find answers from documents you have access to.
          </p>
        </header>

        <div className="flex-1 flex flex-col px-4 sm:px-6 lg:px-8 py-6 max-w-3xl w-full mx-auto">
          {messages.length === 0 && (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-20">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <MessageSquare className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="font-display font-semibold text-xl text-foreground mb-2">
                  Atlantis Assistant
                </h2>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Ask any question and the assistant will search through archive documents to give you a direct answer.
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 w-full max-w-md">
                {[
                  "What is our raid policy?",
                  "Who leads foreign affairs?",
                  "How many members do we have?",
                  "What are the alliance rules?",
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => setQuestion(example)}
                    className="text-left text-xs px-3 py-2 rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground hover:border-primary/30 hover:bg-primary/5 transition-all duration-200"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.length > 0 && (
            <div className="flex-1 flex flex-col gap-4 pb-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex gap-3",
                    msg.type === "user" ? "justify-end" : "justify-start"
                  )}
                >
                  {msg.type !== "user" && (
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5",
                      msg.type === "error"
                        ? "bg-red-500/10 border border-red-500/20"
                        : "bg-primary/10 border border-primary/20"
                    )}>
                      {msg.type === "error"
                        ? <TriangleAlert className="w-4 h-4 text-red-400" />
                        : <BookOpen className="w-4 h-4 text-primary" />
                      }
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                      msg.type === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-sm"
                        : msg.type === "error"
                        ? "bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-sm"
                        : "bg-card/60 border border-white/10 text-foreground rounded-tl-sm"
                    )}
                  >
                    {msg.type === "answer" ? (
                      <div className="space-y-3">
                        <p className="leading-relaxed">{msg.text}</p>
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                            <span className="text-xs text-muted-foreground self-center">Sources:</span>
                            {msg.sources.map((src) => (
                              <Link
                                key={src.id}
                                href={`/document/${src.id}`}
                                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 hover:border-primary/40 transition-colors cursor-pointer"
                                data-testid={`source-link-${src.id}`}
                              >
                                {src.title}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p>{msg.text}</p>
                    )}
                  </div>
                </div>
              ))}

              {isQuerying && (
                <div className="flex gap-3 justify-start">
                  <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center bg-primary/10 border border-primary/20">
                    <BookOpen className="w-4 h-4 text-primary" />
                  </div>
                  <div className="bg-card/60 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    <span className="text-sm text-muted-foreground">Searching the archive...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>
          )}

          <div className="sticky bottom-0 pt-4 pb-2 bg-background/80 backdrop-blur-md">
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question about the archive..."
                className="flex-1 bg-card/40 border-white/10 focus:border-primary/50 placeholder:text-muted-foreground/50"
                disabled={isQuerying}
                data-testid="input-query"
              />
              <Button
                onClick={handleQuery}
                disabled={!question.trim() || isQuerying}
                className="px-4"
                data-testid="button-query-submit"
              >
                {isQuerying ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/40 text-center mt-2">
              Answers are pulled directly from archive documents. Click a source to read the full document.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
