import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { users as authUsers } from "./models/auth";

export * from "./models/auth";

export const CATEGORIES = [
  { value: "guidelines", label: "Atlantis Guidelines" },
  { value: "first-steps", label: "First Steps" },
  { value: "new-players", label: "New Members" },
  { value: "internal-affairs", label: "Internal Affairs" },
  { value: "foreign-affairs", label: "Foreign Affairs" },
  { value: "military", label: "Military" },
  { value: "economy", label: "Economy" },
  { value: "technology", label: "Technology" },
  { value: "intel", label: "Intelligence" },
] as const;

export const CATEGORY_VALUES = CATEGORIES.map(c => c.value);

export const DISCORD_ROLES = {
  ADMIN_ROLES: [
    "\u{1F531}\u30FBLeviathan Lord",
    "\u{1F531}\u30FBHydra Overlord",
    "\u{1F409}\u30FBGuardian",
  ],
  GENERAL_MEMBER_ROLES: [
    "\u{1FAB8}\u30FBTempest",
    "\u{1FABC}\u30FBHydra",
    "\u{1F41F}\u30FBAtlantean",
  ],
  IA_ROLE: "IA",
  FA_ROLE: "FA",
  TECH_ROLE: "Tech",
} as const;

export const CATEGORY_ROLE_ACCESS: Record<string, string[]> = {
  "guidelines": [...DISCORD_ROLES.ADMIN_ROLES, ...DISCORD_ROLES.GENERAL_MEMBER_ROLES],
  "new-players": [...DISCORD_ROLES.ADMIN_ROLES, ...DISCORD_ROLES.GENERAL_MEMBER_ROLES],
  "military": [...DISCORD_ROLES.ADMIN_ROLES, ...DISCORD_ROLES.GENERAL_MEMBER_ROLES],
  "economy": [...DISCORD_ROLES.ADMIN_ROLES, ...DISCORD_ROLES.GENERAL_MEMBER_ROLES],
  "first-steps": [...DISCORD_ROLES.ADMIN_ROLES, ...DISCORD_ROLES.GENERAL_MEMBER_ROLES],
  "internal-affairs": [...DISCORD_ROLES.ADMIN_ROLES, DISCORD_ROLES.IA_ROLE],
  "foreign-affairs": [...DISCORD_ROLES.ADMIN_ROLES, DISCORD_ROLES.FA_ROLE],
  "technology": [...DISCORD_ROLES.ADMIN_ROLES, DISCORD_ROLES.TECH_ROLE],
  "intel": [...DISCORD_ROLES.ADMIN_ROLES],
};

export const documents = pgTable("documents", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  authorId: text("author_id").notNull(),
  isPublic: boolean("is_public").default(false).notNull(),
  category: text("category").default("guidelines").notNull(),
  googleDocUrl: text("google_doc_url"),
  allowedRoles: text("allowed_roles").array(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const documentVersions = pgTable("document_versions", {
  id: serial("id").primaryKey(),
  documentId: integer("document_id").notNull().references(() => documents.id),
  content: text("content").notNull(),
  updatedBy: text("updated_by").notNull(),
  versionNumber: integer("version_number").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertDocumentSchema = createInsertSchema(documents).omit({ 
  id: true, 
  createdAt: true, 
  updatedAt: true,
  authorId: true
});

export const insertVersionSchema = createInsertSchema(documentVersions).omit({
  id: true,
  createdAt: true
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type DocumentVersion = typeof documentVersions.$inferSelect;

export type CreateDocumentRequest = InsertDocument;
export type UpdateDocumentRequest = Partial<InsertDocument>;

export type DocumentResponse = Document & {
  authorName?: string;
};

export type DocumentListResponse = DocumentResponse[];

export interface DocumentsQueryParams {
  search?: string;
  category?: string;
  sortBy?: 'updated' | 'title';
}
