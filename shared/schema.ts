import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users as authUsers } from "./models/auth";

// Re-export auth models so they are picked up by migrations
export * from "./models/auth";

// === TABLE DEFINITIONS ===

// Documents table - stores the current state of a document
export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(), // HTML content from rich text editor
  authorId: text("author_id").notNull(), // Link to authUsers.id (which is string/varchar)
  isPublic: boolean("is_public").default(false).notNull(),
  category: text("category").default("general").notNull(), // intel, archives, diplomacy, etc.
  googleDocUrl: text("google_doc_url"), // Added for Google Doc links
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Document versions - for history/updating "at later dates"
export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  content: text("content").notNull(),
  updatedBy: text("updated_by").notNull(), // Link to authUsers.id
  versionNumber: integer("version_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// === SCHEMAS ===

export const insertDocumentSchema = createInsertSchema(documents).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  authorId: true // set by server from session
});

export const insertVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true
});

// === EXPLICIT TYPES ===

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type DocumentVersion = typeof documentVersions.$inferSelect;

export type CreateDocumentRequest = InsertDocument;
export type UpdateDocumentRequest = Partial<InsertDocument>;

export type DocumentResponse = Document & {
  authorName?: string; // hydrated from user join
};

export type DocumentListResponse = DocumentResponse[];

export interface DocumentsQueryParams {
  search?: string;
  category?: string;
  sortBy?: 'updated' | 'title';
}
