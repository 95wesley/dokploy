-- Remove Tailscale columns from server table
ALTER TABLE "server" DROP COLUMN IF EXISTS "tailscaleIp";
ALTER TABLE "server" DROP COLUMN IF EXISTS "isPrimary";
