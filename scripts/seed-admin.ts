#!/usr/bin/env npx tsx
/**
 * Seed script for creating the initial super_admin user
 * 
 * Usage:
 *   pnpm seed:admin
 *   # or
 *   npx tsx scripts/seed-admin.ts
 * 
 * Environment variables required:
 *   DATABASE_URL - PostgreSQL connection string
 * 
 * Optional arguments:
 *   --email <email>     Admin email (default: admin@truestack.my)
 *   --name <name>       Admin name (default: Super Admin)
 *   --password <pass>   Admin password (default: interactive prompt or 'changeme123')
 */

import { Pool } from "pg";
import crypto from "crypto";

// Simple bcrypt-like password hashing using Node.js crypto
// Note: In production, use proper bcrypt via better-auth's password handling
async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
  return `pbkdf2:${salt}:${hash}`;
}

async function main() {
  const args = process.argv.slice(2);
  
  // Parse arguments
  let email = "admin@truestack.my";
  let name = "Super Admin";
  let password = "changeme123";
  
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) {
      email = args[++i];
    } else if (args[i] === "--name" && args[i + 1]) {
      name = args[++i];
    } else if (args[i] === "--password" && args[i + 1]) {
      password = args[++i];
    }
  }

  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    // Check if super_admin already exists
    const existingResult = await pool.query(
      `SELECT id, email FROM "user" WHERE role = 'super_admin' LIMIT 1`
    );

    if (existingResult.rows.length > 0) {
      console.log(`Super admin already exists: ${existingResult.rows[0].email}`);
      console.log("To create another admin, use a different role or update the existing one.");
      return;
    }

    // Generate IDs
    const userId = `user_${crypto.randomUUID()}`;
    const accountId = `acc_${crypto.randomUUID()}`;

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Start transaction
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Create user
      await client.query(
        `INSERT INTO "user" (id, name, email, email_verified, role)
         VALUES ($1, $2, $3, true, 'super_admin')`,
        [userId, name, email]
      );

      // Create account with password
      await client.query(
        `INSERT INTO account (id, user_id, account_id, provider_id, password)
         VALUES ($1, $2, $3, 'credential', $4)`,
        [accountId, userId, userId, hashedPassword]
      );

      await client.query("COMMIT");

      console.log("\n✓ Super admin created successfully!\n");
      console.log(`  Email:    ${email}`);
      console.log(`  Name:     ${name}`);
      console.log(`  Password: ${password === "changeme123" ? "changeme123 (CHANGE THIS!)" : "***"}`);
      console.log("\n⚠ IMPORTANT: Change the password immediately after first login!\n");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Error seeding admin:", err);
  process.exit(1);
});
