import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import crypto from "crypto";

// Pre-generated bcrypt hash of 'changeme123' for seed
// Note: BetterAuth uses bcrypt for password hashing
const SEED_PASSWORD_HASH = "$2b$10$T6Ng/qA2MGQ00xUj6vpmxueHH6mxj3GfQ/VY2/1Mopx7vW8YB4zli";

async function main() {
  // Enable SSL for production PostgreSQL connections (required by RDS)
  const isProduction = process.env.NODE_ENV === "production";
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });
  
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("🌱 Starting seed...\n");

  // Seed the TrueIdentity product
  const product = await prisma.product.upsert({
    where: { id: "true_identity" },
    update: {},
    create: {
      id: "true_identity",
      name: "TrueIdentity",
      description: "B2B e-KYC verification service",
      keyPrefix: "ti",
      status: "active",
    },
  });
  console.log(`✅ Product: ${product.name}`);

  // Check if super_admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "super_admin" },
  });

  if (!existingAdmin) {
    const adminId = `admin_${crypto.randomUUID()}`;
    const accountId = `acc_${crypto.randomUUID()}`;

    // Create admin user
    const admin = await prisma.user.create({
      data: {
        id: adminId,
        name: "Super Admin",
        email: "admin@truestack.my",
        emailVerified: true,
        role: "super_admin",
      },
    });

    // Create account with password (hash of 'changeme123')
    await prisma.account.create({
      data: {
        id: accountId,
        userId: adminId,
        accountId: adminId,
        providerId: "credential",
        password: SEED_PASSWORD_HASH,
      },
    });

    console.log(`✅ Super admin created: ${admin.email}`);
    console.log("⚠️  IMPORTANT: Change the password immediately after first login!");
  } else {
    console.log(`⏭️  Super admin already exists: ${existingAdmin.email}`);
  }

  console.log("\n🌱 Seed completed!");
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
