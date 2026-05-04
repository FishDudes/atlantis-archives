import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Sparkles, ExternalLink, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface Source { id: number; title: string; }
interface Message { type: "user" | "answer" | "error"; text: string; sources?: Source[]; }

export function AtlantisAI() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll inside the messages container only — never the whole page
  useEffect(() => {
    if (expanded && messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, expanded]);

  const handleQuery = async () => {
    const q = question.trim();
    if (!q || isQuerying) return;
    setExpanded(true);
    setMessages((prev) => [...prev, { type: "user", text: q }]);
    setQuestion("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsQuerying(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Query failed");
      setMessages((prev) => [...prev, { type: "answer", text: data.answer, sources: data.sources }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { type: "error", text: err.message || "Something went wrong." }]);
    } finally {
      setIsQuerying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleQuery();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setQuestion(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
  };

  return (
    <div className="mb-8 rounded-2xl border border-white/10 bg-card/40 backdrop-blur-sm overflow-hidden shadow-xl shadow-black/20">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 via-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-display font-semibold text-sm text-foreground tracking-wide">Atlantis AI</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/20 text-cyan-400 font-medium">AI-Powered</span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", expanded ? "" : "rotate-180")} />
          </button>
        )}
      </div>

      {/* Message history — scrolls internally, never moves the page */}
      {expanded && messages.length > 0 && (
        <div
          ref={messagesContainerRef}
          className="max-h-80 overflow-y-auto px-5 py-4 space-y-4 border-b border-white/5"
        >
          {messages.map((msg, i) => (
            <div key={i} className={cn("flex gap-2.5", msg.type === "user" ? "justify-end" : "justify-start")}>
              {msg.type !== "user" && (
                <div className={cn(
                  "w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center mt-0.5",
                  msg.type === "error"
                    ? "bg-red-500/15 border border-red-500/20"
                    : "bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border border-purple-500/20"
                )}>
                  <Sparkles className={cn("w-3 h-3", msg.type === "error" ? "text-red-400" : "text-cyan-400")} />
                </div>
              )}
              <div className={cn(
                "max-w-[88%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.type === "user"
                  ? "bg-gradient-to-br from-purple-600/40 to-blue-600/40 border border-purple-500/20 text-foreground rounded-tr-sm"
                  : msg.type === "error"
                  ? "bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-sm"
                  : "bg-white/5 border border-white/8 text-foreground rounded-tl-sm"
              )}>
                {msg.type === "answer" ? (
                  <div className="space-y-2.5">
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                        <span className="text-xs text-muted-foreground self-center">Sources:</span>
                        {msg.sources.map((src) => (
                          <Link
                            key={src.id}
                            href={`/document/${src.id}`}
                            className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 hover:border-cyan-500/40 transition-colors cursor-pointer"
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
            <div className="flex gap-2.5 justify-start">
              <div className="w-6 h-6 rounded-md flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border border-purple-500/20">
                <Sparkles className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="bg-white/5 border border-white/8 rounded-xl rounded-tl-sm px-3.5 py-2.5 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                <span className="text-sm text-muted-foreground">Searching the archive...</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Input with animated multi-color glow on hover/focus */}
      <div className="px-4 py-3">
        <div className="ai-glow-input flex items-end gap-2 px-3 py-2 bg-card/60 border border-white/10 rounded-xl">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder="Ask Atlantis AI anything about the archive..."
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 resize-none leading-relaxed min-h-[36px] max-h-[120px] py-1"
            disabled={isQuerying}
            maxLength={500}
            rows={1}
            data-testid="input-atlantis-ai"
          />
          <Button
            onClick={handleQuery}
            disabled={!question.trim() || isQuerying}
            size="sm"
            className="h-8 w-8 p-0 flex-shrink-0 bg-gradient-to-br from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 border-0 shadow-lg shadow-purple-500/20"
            data-testid="button-atlantis-ai-submit"
          >
            {isQuerying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2 px-0.5">
          <p className="text-xs text-muted-foreground/35">
            Powered by DeepSeek · Answers sourced from archive documents
          </p>
          {question.length > 400 && (
            <span className={cn(
              "text-xs tabular-nums",
              question.length >= 500 ? "text-red-400" : "text-amber-400/70"
            )}>
              {question.length}/500
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
