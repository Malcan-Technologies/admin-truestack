import { PrismaClient } from "../generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";
import crypto from "crypto";

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
    
    // Hash password using Better Auth's scrypt (same as runtime)
    const passwordHash = await hashPassword("Demo@123");

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

    // Create account with password
    await prisma.account.create({
      data: {
        id: accountId,
        userId: adminId,
        accountId: adminId,
        providerId: "credential",
        password: passwordHash,
      },
    });

    console.log(`✅ Super admin created: ${admin.email}`);
    console.log("⚠️  IMPORTANT: Change the password immediately after first login!");
  } else {
    console.log(`⏭️  Super admin already exists: ${existingAdmin.email}`);
  }

  // Seed TrueStack Kredit parent client (for Kredit integration)
  const kreditParent = await prisma.client.upsert({
    where: { code: "TRUESTACK_KREDIT" },
    update: {},
    create: {
      name: "TrueStack Kredit",
      code: "TRUESTACK_KREDIT",
      clientType: "parent",
      clientSource: "truestack_kredit",
      contactEmail: "kredit@truestack.my",
      contactPhone: "-",
      companyRegistration: "-",
      status: "active",
      notes: "Parent client for TrueStack Kredit tenants. Each Kredit tenant is a child client.",
    },
  });
  console.log(`✅ TrueStack Kredit parent: ${kreditParent.code}`);

  // Seed sample Kredit tenant (for staged rollout testing)
  const demoTenant = await prisma.client.upsert({
    where: { tenantSlug: "demo-company" },
    update: {},
    create: {
      name: "Demo Company (Kredit Tenant)",
      code: "KREDIT_DEMO_COMPANY",
      clientType: "tenant",
      clientSource: "truestack_kredit",
      parentClientId: kreditParent.id,
      tenantSlug: "demo-company",
      contactEmail: "demo@example.com",
      contactPhone: "-",
      companyRegistration: "-",
      status: "active",
      notes: "Sample tenant for TrueStack Kredit integration testing",
    },
  }).catch(() => null);

  if (demoTenant) {
    // Ensure product config exists for the tenant
    await prisma.clientProductConfig.upsert({
      where: {
        clientId_productId: {
          clientId: demoTenant.id,
          productId: "true_identity",
        },
      },
      update: { enabled: true, allowOverdraft: true },
      create: {
        clientId: demoTenant.id,
        productId: "true_identity",
        enabled: true,
        allowOverdraft: true,
      },
    });
    // Add default pricing tier (RM 4 = 40 credits per verification)
    const existingTier = await prisma.pricingTier.findFirst({
      where: {
        clientId: demoTenant.id,
        productId: "true_identity",
      },
    });
    if (!existingTier) {
      await prisma.pricingTier.create({
        data: {
          clientId: demoTenant.id,
          productId: "true_identity",
          tierName: "Default",
          minVolume: 1,
          maxVolume: null,
          creditsPerSession: 40,
        },
      });
    }
    console.log(`✅ Sample Kredit tenant: ${demoTenant.tenantSlug}`);
  }

  console.log("\n🌱 Seed completed!");
  
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
