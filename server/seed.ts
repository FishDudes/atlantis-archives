import { db } from "./db";
import { documents, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { storage } from "./storage";

async function seed() {
  console.log("Seeding database...");

  // Check if we have documents
  const existingDocs = await storage.getDocuments();
  if (existingDocs.length > 0) {
    console.log("Database already seeded with documents.");
    return;
  }

  // Create a dummy user for the seed data if none exists (though we can't easily login as them without replit auth)
  // For now, we will just use a placeholder ID string for authorId since it's a text field.
  // In a real app, we'd need a real user ID.
  // However, since we're just seeding for display:
  const systemUserId = "system-seed-user";

  // Create "Atlantis" themed documents
  await storage.createDocument({
    title: "Welcome to the Atlantis Archive",
    content: "<p>Welcome, initiate. This archive contains the accumulated wisdom of our alliance. Use the navigation to access intelligence, diplomatic records, and historical archives.</p><p>Remember: <em>Knowledge is power, but secrecy is survival.</em></p>",
    category: "general",
    isPublic: true,
    authorId: systemUserId
  });

  await storage.createDocument({
    title: "Protocol: Deep Dive",
    content: "<h2>Emergency Submersion Protocols</h2><p>In the event of a coalition-level threat, all cities are to activate the <strong>Aegis Shield</strong> generators and submerge to depth level 4.</p><ul><li>Step 1: Secure all resource silos.</li><li>Step 2: Recall all naval assets.</li><li>Step 3: Activate localized jamming.</li></ul>",
    category: "intel",
    isPublic: false,
    authorId: systemUserId
  });

  await storage.createDocument({
    title: "Treaty of the Tides",
    content: "<p><strong>Parties:</strong> Atlantis & The Abyssal Guard</p><p><strong>Terms:</strong></p><ol><li>Mutual defense in the oceanic theater.</li><li>Free trade of uranium and aluminum.</li><li>Joint naval exercises biannually.</li></ol>",
    category: "diplomacy",
    isPublic: true,
    authorId: systemUserId
  });

  console.log("Seeding complete!");
}

seed().catch(console.error).finally(() => process.exit());
