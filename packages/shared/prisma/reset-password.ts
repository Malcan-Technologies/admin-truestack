import { Pool } from "pg";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const email = process.argv[2] || "admin@truestack.my";
  const newPassword = process.argv[3] || "changeme123";

  // Enable SSL for production PostgreSQL connections (required by RDS)
  const isProduction = process.env.NODE_ENV === "production";
  
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false,
  });

  console.log(`🔐 Resetting password for: ${email}\n`);

  try {
    // Find the user
    const userResult = await pool.query(
      'SELECT id, name, email FROM "user" WHERE email = $1',
      [email]
    );

    if (userResult.rows.length === 0) {
      console.error(`❌ User not found: ${email}`);
      process.exit(1);
    }

    const user = userResult.rows[0];
    console.log(`✅ Found user: ${user.name} (${user.email})`);

    // Hash the new password using Better Auth's scrypt
    const passwordHash = await hashPassword(newPassword);

    // Update the account password
    const updateResult = await pool.query(
      'UPDATE account SET password = $1 WHERE user_id = $2 AND provider_id = $3',
      [passwordHash, user.id, "credential"]
    );

    if (updateResult.rowCount === 0) {
      console.error(`❌ No credential account found for user`);
      process.exit(1);
    }

    console.log(`✅ Password updated successfully!`);
    console.log(`\n📝 New credentials:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${newPassword}`);
    console.log(`\n⚠️  Remember to change this password after logging in!`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
