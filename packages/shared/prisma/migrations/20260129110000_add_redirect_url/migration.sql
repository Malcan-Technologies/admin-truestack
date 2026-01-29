-- Add redirect_url column to kyc_session table
-- This allows clients to specify their own redirect URL after KYC completion
-- If specified, Innovatif will redirect users directly to the client's URL instead of TrueStack's status page

ALTER TABLE kyc_session ADD COLUMN IF NOT EXISTS redirect_url TEXT;

-- Add comment explaining the field
COMMENT ON COLUMN kyc_session.redirect_url IS 'Optional client-specified redirect URL. If provided, users are redirected here after KYC completion instead of TrueStack status page.';
