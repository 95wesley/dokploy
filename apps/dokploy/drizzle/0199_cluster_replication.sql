-- Add Tailscale and primary cluster support
ALTER TABLE "server" ADD COLUMN "tailscaleIp" text;
ALTER TABLE "server" ADD COLUMN "isPrimary" boolean NOT NULL DEFAULT false;

-- Create serviceServers junction table for multi-server replication
CREATE TYPE "public"."serviceType" AS ENUM('application', 'compose', 'postgres', 'mysql', 'mariadb', 'mongo', 'redis', 'libsql');
CREATE TYPE "public"."replicationStatus" AS ENUM('synced', 'syncing', 'error', 'pending');

CREATE TABLE IF NOT EXISTS "public"."serviceServers" (
	"id" text PRIMARY KEY NOT NULL,
	"serviceId" text NOT NULL,
	"serviceType" "public"."serviceType" NOT NULL,
	"serverId" text NOT NULL,
	"isPrimary" boolean NOT NULL DEFAULT false,
	"replicationStatus" "public"."replicationStatus" NOT NULL DEFAULT 'pending',
	"replicationError" text,
	"lastSyncedAt" timestamp,
	"createdAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	"updatedAt" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
	FOREIGN KEY ("serverId") REFERENCES "public"."server"("serverId") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "serviceServers_serviceId_idx" ON "public"."serviceServers"("serviceId");
CREATE INDEX IF NOT EXISTS "serviceServers_serviceType_idx" ON "public"."serviceServers"("serviceType");
CREATE INDEX IF NOT EXISTS "serviceServers_serverId_idx" ON "public"."serviceServers"("serverId");
CREATE INDEX IF NOT EXISTS "serviceServers_isPrimary_idx" ON "public"."serviceServers"("isPrimary");
