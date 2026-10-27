import {
	type DockerNode,
	execAsync,
	execAsyncRemote,
	findServerById,
	getRemoteDocker,
	demoteMasterToReplica,
	promotePostgresReplica,
	promoteMysqlReplica,
	promoteRedisReplica,
} from "@dokploy/server";
import { TRPCError } from "@trpc/server";
import { quote } from "shell-quote";
import { z } from "zod";
import { audit } from "@/server/api/utils/audit";
import { getLocalServerIp } from "@/server/wss/terminal";
import { createTRPCRouter, withPermission } from "../trpc";
import {
	findServiceServersByServiceId,
	findPrimaryServiceServer,
	switchoverServicePrimary,
} from "@dokploy/server/services/service-servers";
import { apiSwitchoverServicePrimary } from "@dokploy/server/db/schema";

export const clusterRouter = createTRPCRouter({
	getNodes: withPermission("docker", "read")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			const docker = await getRemoteDocker(input.serverId);
			const workers: DockerNode[] = await docker.listNodes();
			return workers;
		}),

	removeWorker: withPermission("server", "delete")
		.input(
			z.object({
				nodeId: z.string(),
				serverId: z.string().optional(),
			}),
		)
		.mutation(async ({ input, ctx }) => {
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			try {
				const drainCommand = `docker node update --availability drain ${quote([input.nodeId])}`;
				const removeCommand = `docker node rm ${quote([input.nodeId])} --force`;

				if (input.serverId) {
					await execAsyncRemote(input.serverId, drainCommand);
					await execAsyncRemote(input.serverId, removeCommand);
				} else {
					await execAsync(drainCommand);
					await execAsync(removeCommand);
				}
				await audit(ctx, {
					action: "delete",
					resourceType: "cluster",
					resourceId: input.nodeId,
					resourceName: input.nodeId,
				});
				return true;
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Error removing the node",
					cause: error,
				});
			}
		}),

	addWorker: withPermission("server", "create")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			const docker = await getRemoteDocker(input.serverId);
			const result = await docker.swarmInspect();
			const docker_version = await docker.version();
			const info = await docker.info();

			const swarmNodeAddr = info?.Swarm?.NodeAddr;
			let ip = swarmNodeAddr || (await getLocalServerIp());
			if (!swarmNodeAddr && input.serverId) {
				const server = await findServerById(input.serverId);
				ip = server?.ipAddress;
			}

			return {
				command: `docker swarm join --token ${result.JoinTokens.Worker} ${ip}:2377`,
				version: docker_version.Version,
			};
		}),

	addManager: withPermission("server", "create")
		.input(
			z.object({
				serverId: z.string().optional(),
			}),
		)
		.query(async ({ input, ctx }) => {
			if (input.serverId) {
				const targetServer = await findServerById(input.serverId);
				if (targetServer.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}
			const docker = await getRemoteDocker(input.serverId);
			const result = await docker.swarmInspect();
			const docker_version = await docker.version();
			const info = await docker.info();

			const swarmNodeAddr = info?.Swarm?.NodeAddr;
			let ip = swarmNodeAddr || (await getLocalServerIp());
			if (!swarmNodeAddr && input.serverId) {
				const server = await findServerById(input.serverId);
				ip = server?.ipAddress;
			}
			return {
				command: `docker swarm join --token ${result.JoinTokens.Manager} ${ip}:2377`,
				version: docker_version.Version,
			};
		}),

	switchoverPrimary: withPermission("server", "create")
		.input(apiSwitchoverServicePrimary)
		.mutation(async ({ input, ctx }) => {
			try {
				const serviceServers = await findServiceServersByServiceId(
					input.serviceId,
					input.serviceType,
				);

				if (serviceServers.length === 0) {
					throw new TRPCError({
						code: "NOT_FOUND",
						message: "Service not found in any server",
					});
				}

				const oldPrimary = serviceServers.find((s) => s.isPrimary);
				const newPrimary = serviceServers.find(
					(s) => s.serverId === input.newPrimaryServerId,
				);

				if (!oldPrimary || !newPrimary) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "Invalid primary or new primary server",
					});
				}

				// Check authorization
				if (newPrimary.server.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}

				const onData = (msg: string) => console.log(`[Switchover] ${msg}`);

				// Promote new primary based on service type
				if (input.serviceType === "postgres") {
					await promotePostgresReplica(newPrimary.serverId, onData);
				} else if (
					input.serviceType === "mysql" ||
					input.serviceType === "mariadb"
				) {
					await promoteMysqlReplica(newPrimary.serverId, onData);
				} else if (input.serviceType === "redis") {
					await promoteRedisReplica(newPrimary.serverId, onData);
				}

				// Demote old primary
				await demoteMasterToReplica(
					oldPrimary.serverId,
					newPrimary.server.tailscaleIp || newPrimary.server.ipAddress,
					input.serviceType,
					onData,
				);

				// Update database
				await switchoverServicePrimary(
					input.serviceId,
					input.serviceType,
					oldPrimary.id,
					newPrimary.id,
				);

				await audit(ctx, {
					action: "update",
					resourceType: "cluster",
					resourceId: input.serviceId,
					resourceName: `Switchover ${input.serviceType} from ${oldPrimary.serverId} to ${newPrimary.serverId}`,
				});

				return {
					success: true,
					oldPrimary: oldPrimary.serverId,
					newPrimary: newPrimary.serverId,
				};
			} catch (error) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Error switching over primary",
					cause: error,
				});
			}
		}),

	getServiceServers: withPermission("docker", "read")
		.input(
			z.object({
				serviceId: z.string(),
				serviceType: z.enum([
					"application",
					"compose",
					"postgres",
					"mysql",
					"mariadb",
					"mongo",
					"redis",
					"libsql",
				]),
			}),
		)
		.query(async ({ input, ctx }) => {
			const services = await findServiceServersByServiceId(
				input.serviceId,
				input.serviceType,
			);

			for (const svc of services) {
				if (svc.server.organizationId !== ctx.session.activeOrganizationId) {
					throw new TRPCError({
						code: "UNAUTHORIZED",
						message: "You don't have access to this server.",
					});
				}
			}

			return services;
		}),
});
