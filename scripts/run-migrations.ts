#!/usr/bin/env npx tsx
/**
 * Database Migration Runner
 * 
 * This script runs all pending migrations in order.
 * It's designed to be run as an ECS task or locally.
 * 
 * Usage:
 *   DATABASE_URL=... npx tsx scripts/run-migrations.ts
 * 
 * Environment:
 *   DATABASE_URL - PostgreSQL connection string (required)
 */

import { Pool } from "pg";
import fs from "fs";
import path from "path";
import crypto from "crypto";

const MIGRATIONS_DIR = path.join(process.cwd(), "db", "migrations");

interface MigrationRecord {
  id: number;
  name: string;
  hash: string;
  applied_at: Date;
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error("ERROR: DATABASE_URL environment variable is required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  try {
    console.log("🔄 Starting migration runner...\n");

    // Create migrations tracking table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        hash TEXT NOT NULL,
        applied_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
      )
    `);

    // Get applied migrations
    const { rows: applied } = await pool.query<MigrationRecord>(
      "SELECT name, hash FROM _migrations ORDER BY id"
    );
    const appliedMap = new Map(applied.map((m) => [m.name, m.hash]));

    // Get migration files
    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    if (files.length === 0) {
      console.log("No migration files found.");
      return;
    }

    console.log(`Found ${files.length} migration file(s)\n`);

    let appliedCount = 0;
    let skippedCount = 0;

    for (const file of files) {
      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = fs.readFileSync(filePath, "utf-8");
      const hash = crypto.createHash("sha256").update(content).digest("hex").substring(0, 16);

      const existingHash = appliedMap.get(file);

      if (existingHash) {
        if (existingHash !== hash) {
          console.error(`❌ Migration ${file} has been modified after being applied!`);
          console.error(`   Expected hash: ${existingHash}`);
          console.error(`   Current hash:  ${hash}`);
          console.error("   Aborting to prevent data corruption.");
          process.exit(1);
        }
        console.log(`⏭️  Skipping ${file} (already applied)`);
        skippedCount++;
        continue;
      }

      console.log(`📄 Applying ${file}...`);

      const client = await pool.connect();
      try {
        await client.query("BEGIN");

        // Run the migration
        await client.query(content);

        // Record the migration
        await client.query(
          "INSERT INTO _migrations (name, hash) VALUES ($1, $2)",
          [file, hash]
        );

        await client.query("COMMIT");
        console.log(`   ✅ Applied successfully`);
        appliedCount++;
      } catch (error) {
        await client.query("ROLLBACK");
        console.error(`   ❌ Failed to apply ${file}:`);
        console.error(`   ${error instanceof Error ? error.message : error}`);
        process.exit(1);
      } finally {
        client.release();
      }
    }

    console.log("\n========================================");
    console.log(`✅ Migrations complete!`);
    console.log(`   Applied: ${appliedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log("========================================\n");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
