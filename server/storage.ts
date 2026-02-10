import { db } from "./db";
import { eq, desc, ilike, or } from "drizzle-orm";
import { 
  documents, 
  type Document, 
  type InsertDocument, 
  type UpdateDocumentRequest,
  users 
} from "@shared/schema";
import { authStorage } from "./replit_integrations/auth/storage"; // Import auth storage

export interface IStorage {
  // Document operations
  getDocuments(query?: { search?: string; category?: string; sortBy?: 'updated' | 'title' }): Promise<Document[]>;
  getDocument(id: number): Promise<Document | undefined>;
  createDocument(doc: InsertDocument): Promise<Document>;
  updateDocument(id: number, updates: UpdateDocumentRequest): Promise<Document>;
  deleteDocument(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getDocuments(query?: { search?: string; category?: string; sortBy?: 'updated' | 'title' }): Promise<Document[]> {
    let q = db.select().from(documents);
    const conditions = [];

    if (query?.category) {
      conditions.push(eq(documents.category, query.category));
    }

    if (query?.search) {
      conditions.push(
        or(
          ilike(documents.title, `%${query.search}%`),
          ilike(documents.content, `%${query.search}%`)
        )
      );
    }

    if (conditions.length > 0) {
      // @ts-ignore - drizzle type complexity with dynamic where
      q.where(or(...conditions));
    }

    if (query?.sortBy === 'title') {
      q.orderBy(documents.title);
    } else {
      q.orderBy(desc(documents.updatedAt));
    }

    return await q;
  }

  async getDocument(id: number): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async createDocument(doc: InsertDocument & { googleDocUrl?: string }): Promise<Document> {
    const [newDoc] = await db.insert(documents).values(doc).returning();
    return newDoc;
  }

  async updateDocument(id: number, updates: UpdateDocumentRequest): Promise<Document> {
    const [updatedDoc] = await db
      .update(documents)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(documents.id, id))
      .returning();
    return updatedDoc;
  }

  async deleteDocument(id: number): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }
}

export const storage = new DatabaseStorage();
