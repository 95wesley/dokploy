import { db } from "@dokploy/server/db";
import { findServerById } from "@dokploy/server/services/server";
import {
	createMultipleServiceServers,
	deleteServiceServers,
} from "@dokploy/server/services/service-servers";
import type {
	apiCreateServiceServer,
} from "@dokploy/server/db/schema";
import {
	setupPostgresReplication,
	setupMysqlReplication,
	setupRedisReplication,
} from "@dokploy/server/utils/replication/setup-replication";
import type { z } from "zod";

export interface CreateServiceReplicationInput {
	serviceId: string;
	serviceType:
		| "postgres"
		| "mysql"
		| "mariadb"
		| "redis"
		| "mongo"
		| "libsql"
		| "application"
		| "compose";
	primaryServerId: string;
	replicaServerIds: string[];
}

export async function createServiceReplication(
	input: CreateServiceReplicationInput,
	onData?: (msg: string) => void,
) {
	onData?.(`Starting service replication setup for ${input.serviceType}`);

	const primaryServer = await findServerById(input.primaryServerId);

	const serviceServerData: z.infer<typeof apiCreateServiceServer>[] = [
		{
			serviceId: input.serviceId,
			serviceType: input.serviceType as any,
			serverId: input.primaryServerId,
			isPrimary: true,
		},
		...input.replicaServerIds.map((serverId) => ({
			serviceId: input.serviceId,
			serviceType: input.serviceType as any,
			serverId,
			isPrimary: false,
		})),
	];

	await createMultipleServiceServers(serviceServerData);
	onData?.(`Created service server mappings`);

	// Setup replication based on service type
	if (input.serviceType === "postgres") {
		await setupPostgresReplicationIfNeeded(
			input.serviceId,
			input.primaryServerId,
			input.replicaServerIds,
			onData,
		);
	} else if (input.serviceType === "mysql" || input.serviceType === "mariadb") {
		await setupMysqlReplicationIfNeeded(
			input.serviceId,
			input.primaryServerId,
			input.replicaServerIds,
			onData,
		);
	} else if (input.serviceType === "redis") {
		await setupRedisReplicationIfNeeded(
			input.serviceId,
			input.primaryServerId,
			input.replicaServerIds,
			onData,
		);
	}

	onData?.(`Service replication setup complete`);
}

async function setupPostgresReplicationIfNeeded(
	postgresId: string,
	primaryServerId: string,
	replicaServerIds: string[],
	onData?: (msg: string) => void,
) {
	if (replicaServerIds.length === 0) {
		return;
	}

	const primaryServer = await findServerById(primaryServerId);
	const primaryTailscaleIp =
		primaryServer.tailscaleIp || primaryServer.ipAddress;

	// Get postgres details from DB
	const postgres = await db.query.postgres.findFirst({
		where: (table, { eq }) => eq(table.postgresId, postgresId),
	});

	if (!postgres) {
		throw new Error(`PostgreSQL service ${postgresId} not found`);
	}

	for (const replicaServerId of replicaServerIds) {
		onData?.(
			`Setting up PostgreSQL replication to ${replicaServerId}`,
		);
		try {
			await setupPostgresReplication(
				primaryServerId,
				primaryTailscaleIp,
				replicaServerId,
				postgres.databaseUser,
				postgres.databaseName,
				onData,
			);
		} catch (error) {
			onData?.(
				`Warning: PostgreSQL replication setup failed for ${replicaServerId}: ${error}`,
			);
		}
	}
}

async function setupMysqlReplicationIfNeeded(
	mysqlId: string,
	primaryServerId: string,
	replicaServerIds: string[],
	onData?: (msg: string) => void,
) {
	if (replicaServerIds.length === 0) {
		return;
	}

	const primaryServer = await findServerById(primaryServerId);
	const primaryTailscaleIp =
		primaryServer.tailscaleIp || primaryServer.ipAddress;

	// Get mysql details from DB
	const mysql = await db.query.mysql.findFirst({
		where: (table, { eq }) => eq(table.mysqlId, mysqlId),
	});

	if (!mysql) {
		throw new Error(`MySQL service ${mysqlId} not found`);
	}

	for (const replicaServerId of replicaServerIds) {
		onData?.(
			`Setting up MySQL replication to ${replicaServerId}`,
		);
		try {
			await setupMysqlReplication(
				primaryServerId,
				primaryTailscaleIp,
				replicaServerId,
				mysql.databasePassword,
				onData,
			);
		} catch (error) {
			onData?.(
				`Warning: MySQL replication setup failed for ${replicaServerId}: ${error}`,
			);
		}
	}
}

async function setupRedisReplicationIfNeeded(
	redisId: string,
	primaryServerId: string,
	replicaServerIds: string[],
	onData?: (msg: string) => void,
) {
	if (replicaServerIds.length === 0) {
		return;
	}

	const primaryServer = await findServerById(primaryServerId);
	const primaryTailscaleIp =
		primaryServer.tailscaleIp || primaryServer.ipAddress;

	for (const replicaServerId of replicaServerIds) {
		onData?.(
			`Setting up Redis replication to ${replicaServerId}`,
		);
		try {
			await setupRedisReplication(
				primaryServerId,
				primaryTailscaleIp,
				replicaServerId,
				onData,
			);
		} catch (error) {
			onData?.(
				`Warning: Redis replication setup failed for ${replicaServerId}: ${error}`,
			);
		}
	}
}

export async function removeServiceReplication(
	serviceId: string,
	serviceType: string,
) {
	await deleteServiceServers(serviceId, serviceType);
}
