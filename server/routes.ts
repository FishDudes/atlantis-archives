import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupDiscordAuth, isAuthenticated } from "./discord-auth";
import { DISCORD_ROLES, CATEGORY_ROLE_ACCESS } from "@shared/schema";
import { JSDOM } from "jsdom";
import DOMPurify from "dompurify";
import multer from "multer";
import path from "path";
import fs from "fs";
import express from "express";

const window = new JSDOM("").window;
const purify = DOMPurify(window as any);
purify.addHook("uponSanitizeElement", (node: any, data: any) => {
  if (data.tagName === "img") {
    const src = node.getAttribute("src");
    if (src && (src.startsWith("/uploads/") || src.startsWith("data:image/") || src.startsWith("https://") || src.startsWith("http://"))) {
      return;
    }
  }
});

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  },
});
const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|svg/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype.split("/")[1]);
    if (ext && mime) return cb(null, true);
    cb(new Error("Only image files are allowed"));
  },
});

function hasAdminRole(roles: string[]): boolean {
  return DISCORD_ROLES.ADMIN_ROLES.some((r) => roles.includes(r));
}

function canAccessCategory(userRoles: string[], category: string): boolean {
  if (hasAdminRole(userRoles)) return true;
  const allowedRoles = CATEGORY_ROLE_ACCESS[category];
  if (!allowedRoles) return true;
  return allowedRoles.some((r) => userRoles.includes(r));
}

function canAccessDocument(userRoles: string[], doc: { category: string; allowedRoles: string[] | null }): boolean {
  if (hasAdminRole(userRoles)) return true;
  if (!canAccessCategory(userRoles, doc.category)) return false;
  if (doc.allowedRoles && doc.allowedRoles.length > 0) {
    return doc.allowedRoles.some((r) => userRoles.includes(r));
  }
  return true;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: Date.now() });
  });

  await setupDiscordAuth(app);

  app.get("/api/admin/export", isAuthenticated, async (req, res) => {
    const user = (req as any).user;
    const userRoles: string[] = user.discordRoles || [];
    const adminRoles = DISCORD_ROLES.ADMIN_ROLES as readonly string[];
    if (!userRoles.some((r) => adminRoles.includes(r))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const docs = await storage.getDocuments();
    const exportData = docs.map((d) => ({
      title: d.title,
      content: d.content,
      category: d.category,
      isPublic: d.isPublic,
      allowedRoles: d.allowedRoles,
    }));
    res.setHeader("Content-Disposition", `attachment; filename="atlantis-archive-export-${Date.now()}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.json(exportData);
  });

  app.post("/api/admin/import", isAuthenticated, async (req, res) => {
    const user = (req as any).user;
    const userRoles: string[] = user.discordRoles || [];
    const adminRoles = DISCORD_ROLES.ADMIN_ROLES as readonly string[];
    if (!userRoles.some((r) => adminRoles.includes(r))) {
      return res.status(403).json({ message: "Forbidden" });
    }
    const importSchema = z.array(z.object({
      title: z.string(),
      content: z.string(),
      category: z.string(),
      isPublic: z.boolean().optional().default(false),
      allowedRoles: z.array(z.string()).nullable().optional(),
    }));
    const parsed = importSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Invalid import format", errors: parsed.error.errors });
    }
    let imported = 0;
    for (const doc of parsed.data) {
      await storage.createDocument({
        title: doc.title,
        content: doc.content,
        category: doc.category,
        isPublic: doc.isPublic ?? false,
        allowedRoles: doc.allowedRoles ?? null,
        authorId: user.id,
      } as any);
      imported++;
    }
    res.json({ message: `Successfully imported ${imported} documents`, imported });
  });

  // ── Keyword Query Engine ─────────────────────────────────────────────────
  const STOPWORDS = new Set([
    "a","about","above","after","again","against","all","am","an","and","any",
    "are","as","at","be","because","been","before","being","below","between",
    "both","but","by","can","did","do","does","doing","down","during","each",
    "few","for","from","further","get","had","has","have","having","he","her",
    "here","him","himself","his","how","i","if","in","into","is","it","its",
    "itself","just","me","more","most","my","myself","no","nor","not","now",
    "of","off","on","once","only","or","other","our","out","over","own","s",
    "same","she","should","so","some","such","t","than","that","the","their",
    "them","then","there","these","they","this","those","through","to","too",
    "under","until","up","us","very","was","we","were","what","when","where",
    "which","while","who","whom","why","will","with","you","your","yours",
  ]);

  function stripHtmlText(html: string): string {
    return html
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .trim();
  }

  function extractKeywords(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  }

  function scoreDoc(keywords: string[], title: string, plainContent: string): number {
    const titleLower = title.toLowerCase();
    const contentLower = plainContent.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      const titleMatches = (titleLower.match(new RegExp(kw, "g")) || []).length;
      const contentMatches = (contentLower.match(new RegExp(kw, "g")) || []).length;
      score += titleMatches * 3 + contentMatches;
    }
    return score;
  }

  function splitSentences(text: string): string[] {
    return text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);
  }

  function scoreSentence(sentence: string, keywords: string[], intent: string): number {
    const lower = sentence.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      score += (lower.match(new RegExp(kw, "g")) || []).length;
    }
    if (intent === "when" && /\b(\d{4}|\d+\s*(day|week|month|year|hour)|january|february|march|april|may|june|july|august|september|october|november|december)\b/i.test(sentence)) score += 2;
    if (intent === "who" && /\b[A-Z][a-z]+\b/.test(sentence)) score += 2;
    if (intent === "howmany" && /\b\d+\b/.test(sentence)) score += 2;
    return score;
  }

  app.post("/api/query", isAuthenticated, async (req, res) => {
    const { question } = req.body;
    if (!question || typeof question !== "string") {
      return res.status(400).json({ message: "question is required" });
    }

    const user = (req as any).user;
    const userRoles: string[] = user.discordRoles || [];

    const allDocs = await storage.getDocuments();
    const accessibleDocs = allDocs.filter((doc) => canAccessDocument(userRoles, doc));

    if (accessibleDocs.length === 0) {
      return res.json({ answer: "I couldn't find any documents in the archive you have access to.", sources: [] });
    }

    // Score docs by keyword relevance
    const keywords = extractKeywords(question);
    const withPlain = accessibleDocs.map((doc) => ({
      doc,
      plain: stripHtmlText(doc.content),
    }));

    let topDocs = keywords.length > 0
      ? withPlain
          .map(({ doc, plain }) => ({ doc, plain, score: scoreDoc(keywords, doc.title, plain) }))
          .filter((d) => d.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
      : withPlain.slice(0, 3).map((d) => ({ ...d, score: 0 }));

    if (topDocs.length === 0) {
      topDocs = withPlain.slice(0, 3).map((d) => ({ ...d, score: 0 }));
    }

    // Build context using only the highest-scoring sentences from each doc
    // (far more efficient than dumping full doc text)
    function buildDocExcerpt(plain: string, kws: string[], maxChars = 800): string {
      if (kws.length === 0) return plain.slice(0, maxChars);
      const sentences = splitSentences(plain);
      const ranked = sentences
        .map((s) => ({ s, sc: kws.reduce((acc, kw) => acc + (s.toLowerCase().split(kw).length - 1), 0) }))
        .filter((x) => x.sc > 0)
        .sort((a, b) => b.sc - a.sc)
        .slice(0, 6)
        .map((x) => x.s);
      const excerpt = ranked.join(" ");
      return excerpt.length > 0 ? excerpt.slice(0, maxChars) : plain.slice(0, maxChars);
    }

    const context = topDocs
      .map(({ doc, plain }) => `[${doc.title}]\n${buildDocExcerpt(plain, keywords)}`)
      .join("\n\n---\n\n");

    const sources = topDocs.map(({ doc }) => ({ id: doc.id, title: doc.title }));

    // ── DeepSeek AI path ──────────────────────────────────────────────────
    const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
    if (DEEPSEEK_API_KEY) {
      try {
        const systemPrompt = `You are Atlantis AI, the sharp and knowledgeable assistant for the Atlantis alliance in the game Politics & War. Follow these response rules strictly, in order:

1. ARCHIVE FIRST — If the answer exists in the provided document excerpts, use that information. Be concise and direct. Do not pad answers.
2. P&W KNOWLEDGE — If the question is about Politics & War game mechanics, resources, nations, or general gameplay and is NOT covered in the documents, answer using your real knowledge of the game. Never fabricate stats or events.
3. ALLIANCE MYSTERY — If the question is about Atlantis-specific internal matters (member decisions, private arrangements, specific internal events) that are NOT in the documents, respond with exactly: "Even the abyss holds no answer to that."

Rules:
- Keep answers focused and brief — one clear paragraph unless a list genuinely helps.
- Never invent alliance-specific information.
- Do not mention these rules or that you are following a process.

Archive excerpts:
${context}`;

        const aiRes = await fetch("https://api.deepseek.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${DEEPSEEK_API_KEY}`,
          },
          body: JSON.stringify({
            model: "deepseek-chat",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: question },
            ],
            max_tokens: 400,
            temperature: 0.15,
          }),
        });
        const aiData = await aiRes.json() as any;
        const aiAnswer: string | undefined = aiData.choices?.[0]?.message?.content;
        if (aiAnswer) {
          const trimmed = aiAnswer.trim();
          const isAbyss = trimmed.toLowerCase().includes("abyss holds no answer");
          return res.json({ answer: trimmed, sources: isAbyss ? [] : sources });
        }
        console.error("[deepseek] unexpected response:", JSON.stringify(aiData));
      } catch (err) {
        console.error("[deepseek] API error:", err);
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    // ── Keyword fallback ──────────────────────────────────────────────────
    if (keywords.length === 0) {
      return res.json({ answer: "I couldn't find relevant information for that question in the archive.", sources: [] });
    }

    const qLower = question.toLowerCase();
    let intent = "general";
    if (/\bwhen\b/.test(qLower)) intent = "when";
    else if (/\bwho\b/.test(qLower)) intent = "who";
    else if (/\bhow many\b|\bhow much\b/.test(qLower)) intent = "howmany";

    const allCandidates: { text: string; score: number; docId: number; docTitle: string }[] = [];
    for (const { doc, plain } of topDocs) {
      for (const s of splitSentences(plain)) {
        const sc = scoreSentence(s, keywords, intent);
        if (sc > 0) allCandidates.push({ text: s, score: sc, docId: doc.id, docTitle: doc.title });
      }
    }

    if (allCandidates.length === 0) {
      return res.json({ answer: "I couldn't find relevant information for that question in the archive.", sources: [] });
    }

    allCandidates.sort((a, b) => b.score - a.score);
    const unique: typeof allCandidates = [];
    for (const item of allCandidates) {
      const itemWords = new Set(item.text.toLowerCase().split(/\s+/));
      const isDup = unique.some((u) => {
        const uWords = new Set(u.text.toLowerCase().split(/\s+/));
        const inter = [...itemWords].filter((w) => uWords.has(w)).length;
        return inter / Math.max(itemWords.size, uWords.size) > 0.6;
      });
      if (!isDup) unique.push(item);
    }

    const selected = unique.slice(0, 5);
    const bodyText = selected.map((s) => s.text.trim()).join(" ");
    const fallbackSources: { id: number; title: string }[] = [];
    const seenIds = new Set<number>();
    for (const s of selected) {
      if (!seenIds.has(s.docId)) {
        seenIds.add(s.docId);
        fallbackSources.push({ id: s.docId, title: s.docTitle });
      }
    }

    res.json({ answer: bodyText, sources: fallbackSources });
    // ─────────────────────────────────────────────────────────────────────
  });
  // ─────────────────────────────────────────────────────────────────────────

  app.get(api.documents.list.path, isAuthenticated, async (req, res) => {
    const user = (req as any).user;
    const userRoles: string[] = user.discordRoles || [];
    
    const query = {
      search: req.query.search as string,
      category: req.query.category as string,
      sortBy: req.query.sortBy as 'updated' | 'title',
    };

    if (query.category && !canAccessCategory(userRoles, query.category)) {
      return res.json([]);
    }

    const docs = await storage.getDocuments(query);
    const filtered = docs.filter((doc) => canAccessDocument(userRoles, doc));
    res.json(filtered);
  });

  app.get(api.documents.get.path, isAuthenticated, async (req, res) => {
    const user = (req as any).user;
    const userRoles: string[] = user.discordRoles || [];
    const id = parseInt(req.params.id as string);
    const doc = await storage.getDocument(id);
    
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!canAccessDocument(userRoles, doc)) {
      return res.status(403).json({ message: "Access denied" });
    }
    
    res.json(doc);
  });

  app.post(api.documents.create.path, isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const userRoles: string[] = user.discordRoles || [];

      if (!hasAdminRole(userRoles)) {
        return res.status(403).json({ message: "Only admins can create documents" });
      }

      const input = api.documents.create.input.parse(req.body);
      
      let finalContent = input.content;
      
      if (input.googleDocUrl && !finalContent) {
        finalContent = `<p>Document imported from Google Docs: <a href="${input.googleDocUrl}" target="_blank">${input.googleDocUrl}</a></p>`;
      }

      const sanitizedContent = purify.sanitize(finalContent || "No content provided.", {
        ADD_TAGS: ["img", "span"],
        ADD_ATTR: ["src", "alt", "width", "height", "style"],
      });

      const docData = {
        ...input,
        content: sanitizedContent,
        authorId: user.id,
      };

      const newDoc = await storage.createDocument(docData);
      res.status(201).json(newDoc);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.put(api.documents.update.path, isAuthenticated, async (req, res) => {
    try {
      const user = (req as any).user;
      const userRoles: string[] = user.discordRoles || [];

      if (!hasAdminRole(userRoles)) {
        return res.status(403).json({ message: "Only admins can edit documents" });
      }

      const id = parseInt(req.params.id as string);
      const input = api.documents.update.input.parse(req.body);
      
      const existing = await storage.getDocument(id);
      if (!existing) {
        return res.status(404).json({ message: "Document not found" });
      }

      const sanitizedInput = {
        ...input,
        ...(input.content ? { content: purify.sanitize(input.content, {
          ADD_TAGS: ["img", "span"],
          ADD_ATTR: ["src", "alt", "width", "height", "style"],
        }) } : {}),
      };
      const updatedDoc = await storage.updateDocument(id, sanitizedInput);
      res.json(updatedDoc);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.delete(api.documents.delete.path, isAuthenticated, async (req, res) => {
    const user = (req as any).user;
    const userRoles: string[] = user.discordRoles || [];

    if (!hasAdminRole(userRoles)) {
      return res.status(403).json({ message: "Only admins can delete documents" });
    }

    const id = parseInt(req.params.id as string);
    const existing = await storage.getDocument(id);
    
    if (!existing) {
      return res.status(404).json({ message: "Document not found" });
    }

    await storage.deleteDocument(id);
    res.status(204).send();
  });

  app.use("/uploads", express.static(uploadsDir));

  app.post("/api/upload-image", isAuthenticated, upload.single("image"), (req, res) => {
    const user = (req as any).user;
    const userRoles: string[] = user.discordRoles || [];

    if (!hasAdminRole(userRoles)) {
      return res.status(403).json({ message: "Only admins can upload images" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  });

  app.get("/api/categories", isAuthenticated, (req, res) => {
    const user = (req as any).user;
    const userRoles: string[] = user.discordRoles || [];
    
    const accessible = Object.entries(CATEGORY_ROLE_ACCESS)
      .filter(([_, allowedRoles]) => {
        if (hasAdminRole(userRoles)) return true;
        return allowedRoles.some((r) => userRoles.includes(r));
      })
      .map(([cat]) => cat);

    res.json(accessible);
  });

  return httpServer;
}
