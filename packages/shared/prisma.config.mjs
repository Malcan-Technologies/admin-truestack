// Prisma 7 config - using .mjs to ensure proper module loading
// This file MUST be able to read DATABASE_URL from the environment
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from shared package and repo root (root overrides)
loadEnv({ path: path.join(__dirname, ".env") });
loadEnv({ path: path.join(__dirname, "../../.env") });

export default {
  schema: path.join(__dirname, "prisma", "schema.prisma"),
  migrations: {
    path: path.join(__dirname, "prisma", "migrations"),
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
};
