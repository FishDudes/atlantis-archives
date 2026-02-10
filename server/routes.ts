import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupDiscordAuth, isAuthenticated } from "./discord-auth";
import { DISCORD_ROLES, CATEGORY_ROLE_ACCESS } from "@shared/schema";

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
  
  await setupDiscordAuth(app);

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
        finalContent = `<p>Document imported from Google Docs: <a href="${input.googleDocUrl}" target="_blank" class="text-primary hover:underline">${input.googleDocUrl}</a></p><p>Content will be rendered here maintaining formatting.</p>`;
      }

      const docData = {
        ...input,
        content: finalContent || "No content provided.",
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

      const updatedDoc = await storage.updateDocument(id, input);
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
