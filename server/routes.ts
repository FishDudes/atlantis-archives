import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // 1. Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // 2. Document Routes

  // List documents (Protected)
  app.get(api.documents.list.path, isAuthenticated, async (req, res) => {
    const query = {
      search: req.query.search as string,
      category: req.query.category as string,
      sortBy: req.query.sortBy as 'updated' | 'title',
    };
    const docs = await storage.getDocuments(query);
    res.json(docs);
  });

  // Get document (Protected)
  app.get(api.documents.get.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const doc = await storage.getDocument(id);
    
    if (!doc) {
      return res.status(404).json({ message: "Document not found" });
    }
    
    res.json(doc);
  });

  // Create document (Protected)
  app.post(api.documents.create.path, isAuthenticated, async (req, res) => {
    try {
      const input = api.documents.create.input.parse(req.body);
      
      // Add authorId from session
      const docData = {
        ...input,
        // @ts-ignore - user exists due to isAuthenticated
        authorId: req.user.claims.sub, 
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

  // Update document (Protected)
  app.put(api.documents.update.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const input = api.documents.update.input.parse(req.body);
      
      const existing = await storage.getDocument(id);
      if (!existing) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Optional: Check if user is author? For now, allow any member to update (wiki style)
      // or restrict to author/admin if needed later.

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

  // Delete document (Protected)
  app.delete(api.documents.delete.path, isAuthenticated, async (req, res) => {
    const id = parseInt(req.params.id);
    const existing = await storage.getDocument(id);
    
    if (!existing) {
      return res.status(404).json({ message: "Document not found" });
    }

    await storage.deleteDocument(id);
    res.status(204).send();
  });

  return httpServer;
}
