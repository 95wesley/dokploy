import { db } from "@dokploy/server/db";
import {
	serviceServers,
	type apiCreateServiceServer,
	type apiSwitchoverServicePrimary,
	type apiUpdateServiceServerStatus,
} from "@dokploy/server/db/schema";
import { and, eq } from "drizzle-orm";
import type { z } from "zod";

export const findServiceServersByServiceId = async (
	serviceId: string,
	serviceType: string,
) => {
	return await db.query.serviceServers.findMany({
		where: and(
			eq(serviceServers.serviceId, serviceId),
			eq(serviceServers.serviceType, serviceType as any),
		),
		with: {
			server: true,
		},
	});
};

export const createServiceServer = async (
	input: z.infer<typeof apiCreateServiceServer>,
) => {
	return await db.insert(serviceServers).values(input).returning();
};

export const createMultipleServiceServers = async (
	data: z.infer<typeof apiCreateServiceServer>[],
) => {
	if (data.length === 0) return [];
	return await db.insert(serviceServers).values(data).returning();
};

export const updateServiceServerStatus = async (
	input: z.infer<typeof apiUpdateServiceServerStatus>,
) => {
	const updateData: Record<string, any> = {
		replicationError: input.replicationError,
	};
	if (input.replicationStatus) {
		updateData.replicationStatus = input.replicationStatus;
	}
	return await db
		.update(serviceServers)
		.set(updateData)
		.where(eq(serviceServers.id, input.id as any))
		.returning();
};

export const updateServiceServerPrimary = async (
	id: string,
	isPrimary: boolean,
) => {
	return await db
		.update(serviceServers)
		.set({
			isPrimary,
		})
		.where(eq(serviceServers.id, id))
		.returning();
};

export const deleteServiceServers = async (
	serviceId: string,
	serviceType: string,
) => {
	return await db
		.delete(serviceServers)
		.where(
			and(
				eq(serviceServers.serviceId, serviceId),
				eq(serviceServers.serviceType, serviceType as any),
			),
		)
		.returning();
};

export const findPrimaryServiceServer = async (
	serviceId: string,
	serviceType: string,
) => {
	return await db.query.serviceServers.findFirst({
		where: and(
			eq(serviceServers.serviceId, serviceId),
			eq(serviceServers.serviceType, serviceType as any),
			eq(serviceServers.isPrimary, true),
		),
		with: {
			server: true,
		},
	});
};

export const switchoverServicePrimary = async (
	serviceId: string,
	serviceType: string,
	oldPrimaryId: string,
	newPrimaryId: string,
) => {
	// Demote old primary
	await db
		.update(serviceServers)
		.set({
			isPrimary: false,
		})
		.where(eq(serviceServers.id, oldPrimaryId));

	// Promote new primary
	return await db
		.update(serviceServers)
		.set({
			isPrimary: true,
		})
		.where(eq(serviceServers.id, newPrimaryId))
		.returning();
};
