import { build as esbuild } from "esbuild";
import { build as viteBuild } from "vite";
import { rm, readFile } from "fs/promises";

// server deps to bundle to reduce openat(2) syscalls
// which helps cold start times
const allowlist = [
  "@google/generative-ai",
  "@neondatabase/serverless",
  "axios",
  "connect-pg-simple",
  "cors",
  "date-fns",
  "drizzle-orm",
  "drizzle-zod",
  "express",
  "express-rate-limit",
  "express-session",
  "jsonwebtoken",
  "memorystore",
  "multer",
  "nanoid",
  "nodemailer",
  "openai",
  "passport",
  "passport-local",
  "pg",
  "stripe",
  "uuid",
  "ws",
  "xlsx",
  "zod",
  "zod-validation-error",
];

async function wakeDatabase() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) return;
  try {
    // Dynamically import so this only runs if the package is available
    const { Pool, neonConfig } = await import("@neondatabase/serverless");
    const wsModule = await import("ws");
    neonConfig.webSocketConstructor = wsModule.default;
    const pool = new Pool({ connectionString: dbUrl });
    await pool.query("SELECT 1");
    await pool.end();
    console.log("Database woken up successfully.");
  } catch (err) {
    console.warn("Could not wake database (non-fatal):", err);
  }
}

async function buildAll() {
  await rm("dist", { recursive: true, force: true });

  console.log("building client...");
  await viteBuild();

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];
  const externals = allDeps.filter((dep) => !allowlist.includes(dep));

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: true,
    external: externals,
    logLevel: "info",
  });

  // Wake the production database so Replit's post-build schema check
  // doesn't hit a suspended Neon endpoint.
  console.log("Waking database before schema check...");
  await wakeDatabase();
}

buildAll().catch((err) => {
  console.error(err);
  process.exit(1);
});
