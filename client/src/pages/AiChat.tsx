import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Loader2, Send, Sparkles, ExternalLink, ArrowLeft, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownText } from "@/components/MarkdownText";
import { useAIRateLimit } from "@/hooks/useAIRateLimit";

interface Source { id: number; title: string; }
interface Message { type: "user" | "answer" | "error"; text: string; sources?: Source[]; }

const PROMPTS = ["Recommended build order?", "What is beige in P&W?", "Raiding rules?"];

export default function AiChat() {
  const [, navigate] = useLocation();
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { canSend, inCooldown, cooldownLabel, isTimedOut, timeoutLabel, recordSend } = useAIRateLimit();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleQuery = async () => {
    const q = question.trim();
    if (!q || isQuerying) return;
    if (!recordSend()) return;
    setMessages((prev) => [...prev, { type: "user", text: q }]);
    setQuestion("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.blur();
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

  const sendDisabled = !question.trim() || isQuerying || !canSend;

  return (
    <div className="flex flex-col h-[100dvh] bg-background overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10 bg-card/60 backdrop-blur-sm flex-shrink-0">
        <button
          onClick={() => navigate("/dashboard")}
          className="p-1.5 -ml-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          data-testid="button-ai-chat-back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-600 via-cyan-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20 flex-shrink-0">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-display font-semibold text-sm text-foreground tracking-wide">Atlantis AI</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500/20 to-cyan-500/20 border border-purple-500/20 text-cyan-400 font-medium flex-shrink-0">AI-Powered</span>
        </div>
      </div>

      {/* ── Rate limit banner ── */}
      {(isTimedOut || inCooldown) && (
        <div className={cn(
          "flex items-center gap-2 px-4 py-2 text-xs flex-shrink-0",
          isTimedOut
            ? "bg-red-500/10 border-b border-red-500/20 text-red-400"
            : "bg-amber-500/10 border-b border-amber-500/20 text-amber-400"
        )}>
          <Clock className="w-3.5 h-3.5 flex-shrink-0" />
          {isTimedOut
            ? `Timed out for sending too many messages. Try again in ${timeoutLabel}.`
            : `Wait ${cooldownLabel} before sending another message.`}
        </div>
      )}

      {/* ── Messages / Empty state ── */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {messages.length === 0 ? (
          /* Empty state — compact, vertically centered */
          <div className="flex flex-col items-center justify-center h-full px-6 gap-5 text-center">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-600/30 via-cyan-500/20 to-blue-500/30 border border-purple-500/20 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <p className="font-display font-semibold text-foreground text-base mb-1">Ask Atlantis AI</p>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
                Ask about the archive, alliance rules, or P&amp;W game mechanics.
              </p>
            </div>
            {/* Suggestion chips — horizontal scroll on narrow screens */}
            <div className="flex gap-2 flex-wrap justify-center max-w-sm">
              {PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => { setQuestion(prompt); textareaRef.current?.focus(); }}
                  className="text-xs px-3.5 py-2 rounded-full border border-white/10 bg-white/5 text-muted-foreground hover:bg-white/10 hover:text-foreground hover:border-cyan-500/20 transition-all whitespace-nowrap"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={cn("flex gap-2.5", msg.type === "user" ? "justify-end" : "justify-start")}>
                {msg.type !== "user" && (
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center mt-0.5",
                    msg.type === "error"
                      ? "bg-red-500/15 border border-red-500/20"
                      : "bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border border-purple-500/20"
                  )}>
                    <Sparkles className={cn("w-3.5 h-3.5", msg.type === "error" ? "text-red-400" : "text-cyan-400")} />
                  </div>
                )}
                <div className={cn(
                  "max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                  msg.type === "user"
                    ? "bg-gradient-to-br from-purple-600/50 to-blue-600/50 border border-purple-500/20 text-foreground rounded-tr-sm"
                    : msg.type === "error"
                    ? "bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-sm"
                    : "bg-white/5 border border-white/10 text-foreground rounded-tl-sm"
                )}>
                  {msg.type === "answer" ? (
                    <div className="space-y-3">
                      <MarkdownText text={msg.text} />
                      {msg.sources && msg.sources.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-2.5 border-t border-white/10">
                          <span className="text-xs text-muted-foreground self-center">Sources:</span>
                          {msg.sources.map((src) => (
                            <Link
                              key={src.id}
                              href={`/document/${src.id}`}
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
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
                <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center bg-gradient-to-br from-purple-600/30 to-cyan-500/30 border border-purple-500/20">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                  <span className="text-sm text-muted-foreground">Searching the archive...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* ── Input bar — always pinned to bottom ── */}
      <div className="flex-shrink-0 px-3 pt-2 pb-safe-or-3 border-t border-white/10 bg-card/60 backdrop-blur-sm" style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}>
        <div className="ai-glow-input flex items-end gap-2 px-3 py-2 bg-background/60 border border-white/10 rounded-2xl">
          <textarea
            ref={textareaRef}
            value={question}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={isTimedOut ? "You are timed out from Atlantis AI." : "Ask anything about the archive..."}
            className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground/50 resize-none leading-relaxed min-h-[36px] max-h-[120px] py-1"
            disabled={isQuerying || isTimedOut}
            maxLength={500}
            rows={1}
            data-testid="input-ai-chat"
          />
          <Button
            onClick={handleQuery}
            disabled={sendDisabled}
            size="sm"
            className="h-9 w-9 p-0 flex-shrink-0 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 border-0 shadow-lg shadow-purple-500/20 disabled:opacity-40"
            data-testid="button-ai-chat-submit"
          >
            {isQuerying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : inCooldown ? (
              <span className="text-[10px] font-bold tabular-nums">{cooldownLabel}</span>
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground/30 text-center mt-1.5">
          Powered by DeepSeek · Sourced from the archive
        </p>
      </div>

    </div>
  );
}
