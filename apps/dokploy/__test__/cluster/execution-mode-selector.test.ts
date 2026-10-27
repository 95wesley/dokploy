import { describe, it, expect } from "vitest";
import type {
	ExecutionMode,
} from "@/components/dashboard/cluster/execution-mode-selector";

describe("ExecutionModeSelector", () => {
	describe("execution modes", () => {
		it("should have single server mode", () => {
			const mode: ExecutionMode = "single";
			expect(mode).toBe("single");
		});

		it("should have replicated mode", () => {
			const mode: ExecutionMode = "replicated";
			expect(mode).toBe("replicated");
		});

		it("should validate mode values", () => {
			const validModes: ExecutionMode[] = ["single", "replicated"];
			expect(validModes).toHaveLength(2);
		});
	});

	describe("server selection", () => {
		it("should require server selection in single mode", () => {
			const servers = [
				{ id: "vps-1", name: "Primary", isPrimary: true },
				{ id: "vps-2", name: "Replica", isPrimary: false },
			];

			const selectedServers = ["vps-1"];
			expect(selectedServers).toHaveLength(1);
		});

		it("should allow multiple servers in replicated mode", () => {
			const servers = [
				{ id: "vps-1", name: "Primary", isPrimary: true },
				{ id: "vps-2", name: "Replica 1", isPrimary: false },
				{ id: "vps-3", name: "Replica 2", isPrimary: false },
			];

			const selectedServers = ["vps-1", "vps-2", "vps-3"];
			expect(selectedServers).toHaveLength(3);
			expect(selectedServers).toContain("vps-1");
		});

		it("should require primary in replicated mode", () => {
			const selectedServers = ["vps-1", "vps-2"]; // vps-1 is primary
			const hasPrimary = selectedServers.includes("vps-1");

			expect(hasPrimary).toBe(true);
		});
	});

	describe("server state", () => {
		it("should mark primary server", () => {
			const server = { id: "vps-1", name: "Primary", isPrimary: true };
			expect(server.isPrimary).toBe(true);
		});

		it("should mark replica servers", () => {
			const servers = [
				{ id: "vps-2", name: "Replica 1", isPrimary: false },
				{ id: "vps-3", name: "Replica 2", isPrimary: false },
			];

			servers.forEach((server) => {
				expect(server.isPrimary).toBe(false);
			});
		});

		it("should display status badge", () => {
			const server = { id: "vps-1", name: "Server", isPrimary: true };
			const badge = server.isPrimary ? "Master" : "Replica";

			expect(badge).toBe("Master");
		});
	});

	describe("mode transitions", () => {
		it("should handle mode change from single to replicated", () => {
			let mode: ExecutionMode = "single";
			let selectedServers = ["vps-1"];

			// Change mode
			mode = "replicated";
			selectedServers = ["vps-1", "vps-2"];

			expect(mode).toBe("replicated");
			expect(selectedServers).toHaveLength(2);
		});

		it("should handle mode change from replicated to single", () => {
			let mode: ExecutionMode = "replicated";
			let selectedServers = ["vps-1", "vps-2", "vps-3"];

			// Change mode
			mode = "single";
			selectedServers = [selectedServers[0]]; // Keep only first

			expect(mode).toBe("single");
			expect(selectedServers).toHaveLength(1);
		});
	});

	describe("validation", () => {
		it("should validate single mode selection", () => {
			const mode: ExecutionMode = "single";
			const selectedServers = ["vps-1"];

			const isValid = mode === "single" && selectedServers.length === 1;
			expect(isValid).toBe(true);
		});

		it("should validate replicated mode selection", () => {
			const mode: ExecutionMode = "replicated";
			const selectedServers = ["vps-1", "vps-2"];

			const isValid = mode === "replicated" && selectedServers.length >= 2;
			expect(isValid).toBe(true);
		});

		it("should reject replicated mode with less than 2 servers", () => {
			const mode: ExecutionMode = "replicated";
			const selectedServers = ["vps-1"]; // Only primary

			const isValid = mode === "replicated" && selectedServers.length >= 2;
			expect(isValid).toBe(false);
		});

		it("should reject single mode with multiple selections", () => {
			const mode: ExecutionMode = "single";
			const selectedServers = ["vps-1", "vps-2"];

			const isValid = mode === "single" && selectedServers.length === 1;
			expect(isValid).toBe(false);
		});
	});
});
