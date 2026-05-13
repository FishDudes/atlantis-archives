import { useState, useEffect, useRef } from "react";

const KEY_TIMESTAMPS = "ai_msg_timestamps";
const KEY_TIMEOUT = "ai_timeout_until";
const COOLDOWN_MS = 5000;
const MAX_PER_MINUTE = 5;
const WINDOW_MS = 60_000;
const TIMEOUT_MS = 24 * 60 * 60 * 1000;

function getTimestamps(): number[] {
  try { return JSON.parse(localStorage.getItem(KEY_TIMESTAMPS) || "[]"); } catch { return []; }
}

function formatTimeoutRemaining(ms: number): string {
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (h > 0) return `${h}h ${m}m`;
  const s = Math.ceil((ms % 60_000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export function useAIRateLimit() {
  const [tick, setTick] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timer.current = setInterval(() => setTick((n) => n + 1), 500);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, []);

  const now = Date.now();
  const timeoutUntil = parseInt(localStorage.getItem(KEY_TIMEOUT) || "0");
  const isTimedOut = now < timeoutUntil;
  const timeoutLabel = isTimedOut ? formatTimeoutRemaining(timeoutUntil - now) : "";

  const recent = getTimestamps().filter((t) => now - t < WINDOW_MS);
  const lastSent = recent.length > 0 ? Math.max(...recent) : 0;
  const cooldownMs = Math.max(0, lastSent + COOLDOWN_MS - now);
  const cooldownLabel = cooldownMs > 0 ? `${Math.ceil(cooldownMs / 1000)}s` : "";
  const inCooldown = cooldownMs > 0;

  const canSend = !isTimedOut && !inCooldown;

  const recordSend = (): boolean => {
    const n = Date.now();
    const ts = getTimestamps().filter((t) => n - t < WINDOW_MS);
    if (isTimedOut) return false;
    if (ts.length >= MAX_PER_MINUTE) {
      localStorage.setItem(KEY_TIMEOUT, String(n + TIMEOUT_MS));
      return false;
    }
    localStorage.setItem(KEY_TIMESTAMPS, JSON.stringify([...ts, n]));
    return true;
  };

  return { canSend, inCooldown, cooldownLabel, isTimedOut, timeoutLabel, recordSend };
}
