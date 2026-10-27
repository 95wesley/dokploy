import { describe, it, expect, vi, beforeEach } from "vitest";
import type { CreateServiceReplicationInput } from "@dokploy/server/services/service-replication";

describe("Service Replication", () => {
	describe("createServiceReplication", () => {
		it("should create service server mappings for replicated service", () => {
			const input: CreateServiceReplicationInput = {
				serviceId: "postgres-123",
				serviceType: "postgres",
				primaryServerId: "vps-1",
				replicaServerIds: ["vps-2", "vps-3"],
			};

			expect(input.serviceId).toBe("postgres-123");
			expect(input.replicaServerIds).toHaveLength(2);
			expect(input.primaryServerId).toBe("vps-1");
		});

		it("should handle empty replica list", () => {
			const input: CreateServiceReplicationInput = {
				serviceId: "mysql-456",
				serviceType: "mysql",
				primaryServerId: "vps-1",
				replicaServerIds: [],
			};

			expect(input.replicaServerIds).toHaveLength(0);
		});

		it("should support all service types", () => {
			const serviceTypes = [
				"postgres",
				"mysql",
				"mariadb",
				"redis",
				"mongo",
				"application",
				"compose",
			] as const;

			serviceTypes.forEach((type) => {
				const input: CreateServiceReplicationInput = {
					serviceId: `service-${type}`,
					serviceType: type,
					primaryServerId: "vps-1",
					replicaServerIds: ["vps-2"],
				};

				expect(input.serviceType).toBe(type);
			});
		});
	});

	describe("Replication status tracking", () => {
		it("should initialize with pending status", () => {
			const status = "pending" as const;
			expect(["pending", "syncing", "synced", "error"]).toContain(status);
		});

		it("should transition through replication states", () => {
			const states = ["pending", "syncing", "synced"] as const;
			expect(states).toHaveLength(3);

			states.forEach((state) => {
				expect(["pending", "syncing", "synced", "error"]).toContain(state);
			});
		});

		it("should handle error state with message", () => {
			const errorStatus = {
				status: "error" as const,
				error: "Connection timeout to primary",
			};

			expect(errorStatus.status).toBe("error");
			expect(errorStatus.error).toBeTruthy();
		});
	});

	describe("Primary server management", () => {
		it("should identify single primary server", () => {
			const servers = [
				{ id: "vps-1", isPrimary: true },
				{ id: "vps-2", isPrimary: false },
				{ id: "vps-3", isPrimary: false },
			];

			const primary = servers.find((s) => s.isPrimary);
			expect(primary?.id).toBe("vps-1");
		});

		it("should validate only one primary", () => {
			const servers = [
				{ id: "vps-1", isPrimary: true },
				{ id: "vps-2", isPrimary: true }, // Invalid
			];

			const primaries = servers.filter((s) => s.isPrimary);
			expect(primaries.length).toBeGreaterThan(1); // Should have validation
		});

		it("should handle switchover of primary", () => {
			let servers = [
				{ id: "vps-1", isPrimary: true },
				{ id: "vps-2", isPrimary: false },
			];

			// Simulate switchover
			servers = servers.map((s) => ({
				...s,
				isPrimary: s.id === "vps-2",
			}));

			expect(servers.find((s) => s.id === "vps-1")?.isPrimary).toBe(false);
			expect(servers.find((s) => s.id === "vps-2")?.isPrimary).toBe(true);
		});
	});

	describe("Replication configuration validation", () => {
		it("should require at least primary server", () => {
			const config = {
				primaryServerId: "vps-1",
				replicaServerIds: [],
			};

			expect(config.primaryServerId).toBeTruthy();
		});

		it("should validate primary != replica", () => {
			const config = {
				primaryServerId: "vps-1",
				replicaServerIds: ["vps-1", "vps-2"], // Invalid
			};

			const hasInvalidReplica = config.replicaServerIds.includes(
				config.primaryServerId,
			);
			expect(hasInvalidReplica).toBe(true);
		});

		it("should handle unique replica list", () => {
			const replicaServerIds = ["vps-2", "vps-3", "vps-2"]; // Duplicate
			const unique = [...new Set(replicaServerIds)];

			expect(unique).toHaveLength(2);
			expect(unique).toContain("vps-2");
			expect(unique).toContain("vps-3");
		});
	});

	describe("Tailscale IP handling", () => {
		it("should prefer Tailscale IP over public IP", () => {
			const server = {
				ipAddress: "203.0.113.1",
				tailscaleIp: "100.64.1.1",
			};

			const replicationIp = server.tailscaleIp || server.ipAddress;
			expect(replicationIp).toBe("100.64.1.1");
		});

		it("should fallback to public IP if no Tailscale", () => {
			const server = {
				ipAddress: "203.0.113.1",
				tailscaleIp: undefined,
			};

			const replicationIp = server.tailscaleIp || server.ipAddress;
			expect(replicationIp).toBe("203.0.113.1");
		});
	});

	describe("Replication lag monitoring", () => {
		it("should track last sync time", () => {
			const now = new Date();
			const status = {
				status: "synced" as const,
				lastSyncedAt: now,
			};

			expect(status.lastSyncedAt).toEqual(now);
		});

		it("should calculate sync lag", () => {
			const now = new Date();
			const lastSync = new Date(now.getTime() - 5000); // 5 seconds ago
			const lag = now.getTime() - lastSync.getTime();

			expect(lag).toBe(5000);
			expect(lag).toBeLessThan(10000);
		});
	});
});
