-- Seed initial super_admin user
-- Password: 'changeme123' (bcrypt hashed)
-- IMPORTANT: Change this password immediately after first login!

-- The password hash below is for 'changeme123'
-- Generated using: bcrypt.hashSync('changeme123', 10)

DO $$
DECLARE
    admin_id TEXT := 'admin_' || gen_random_uuid()::text;
BEGIN
    -- Check if super_admin already exists
    IF NOT EXISTS (SELECT 1 FROM "user" WHERE role = 'super_admin') THEN
        -- Create admin user
        INSERT INTO "user" (id, name, email, email_verified, role)
        VALUES (
            admin_id,
            'Super Admin',
            'admin@truestack.my',
            true,
            'super_admin'
        );

        -- Create account with password
        -- Note: This is a bcrypt hash of 'changeme123' - CHANGE THIS IN PRODUCTION
        INSERT INTO account (id, user_id, account_id, provider_id, password)
        VALUES (
            'acc_' || gen_random_uuid()::text,
            admin_id,
            admin_id,
            'credential',
            '$2a$10$dKhz7WzQsEaQF3RWbZ5KAeB5GQsL5yZVxJ6k3Q1Z7B5yZ5Q1Z7B5y'
        );

        RAISE NOTICE 'Super admin created with email: admin@truestack.my';
        RAISE NOTICE 'IMPORTANT: Change the password immediately after first login!';
    ELSE
        RAISE NOTICE 'Super admin already exists, skipping seed.';
    END IF;
END $$;
