import { execAsyncRemote } from "@dokploy/server/utils/process/execAsync";

const TAILSCALE_IP_PREFIX = "100.";
const TAILSCALE_IP_REGEX = /^100\.\d+\.\d+\.\d+$/;

export async function detectTailscaleIp(
	serverId: string,
	onData?: (msg: string) => void,
): Promise<string | null> {
	try {
		onData?.(`Detecting Tailscale IP on server ${serverId}...`);

		const output = await execAsyncRemote(
			serverId,
			"tailscale ip -4 2>/dev/null || echo ''",
			onData,
		);

		const ip = (typeof output === "string" ? output : output?.stdout || "")
			.trim()
			.split("\n")[0];

		if (ip && TAILSCALE_IP_REGEX.test(ip)) {
			onData?.(`✅ Found Tailscale IP: ${ip}`);
			return ip;
		}

		if (!ip) {
			onData?.(
				`⚠️  Tailscale not connected. Authenticate with: tailscale up --hostname=dokploy-\$RANDOM`,
			);
		} else {
			onData?.(`⚠️  Invalid Tailscale IP format: ${ip}`);
		}
		return null;
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		onData?.(`❌ Error detecting Tailscale IP: ${errorMessage}`);
		return null;
	}
}

export async function isTailscaleInstalled(
	serverId: string,
	onData?: (msg: string) => void,
): Promise<boolean> {
	try {
		await execAsyncRemote(serverId, "command -v tailscale >/dev/null 2>&1", onData);
		return true;
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		if (!errorMessage.includes("command not found")) {
			onData?.(
				`⚠️  Unexpected error checking Tailscale: ${errorMessage}`,
			);
		}
		return false;
	}
}

export interface TailscaleStatus {
	installed: boolean;
	connected: boolean;
	ip?: string;
	error?: string;
}

export async function getTailscaleStatus(
	serverId: string,
	onData?: (msg: string) => void,
): Promise<TailscaleStatus> {
	try {
		const installed = await isTailscaleInstalled(serverId, onData);

		if (!installed) {
			return {
				installed: false,
				connected: false,
				error: "Tailscale not installed",
			};
		}

		const ip = await detectTailscaleIp(serverId, onData);

		return {
			installed: true,
			connected: !!ip,
			ip: ip || undefined,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : String(error);
		return {
			installed: false,
			connected: false,
			error: errorMessage,
		};
	}
}

export async function useSwarmAdvertiseAddr(
	serverId: string,
	preferTailscale = true,
	onData?: (msg: string) => void,
): Promise<string | null> {
	if (!preferTailscale) {
		onData?.(`ℹ️  Using public IP for Docker Swarm advertise address`);
		return null;
	}

	const tailscaleIp = await detectTailscaleIp(serverId, onData);

	if (tailscaleIp) {
		onData?.(
			`ℹ️  Using Tailscale private IP ${tailscaleIp} for Docker Swarm advertise address`,
		);
		return tailscaleIp;
	}

	onData?.(
		`ℹ️  Tailscale not available, Docker Swarm will use public IP`,
	);
	return null;
}
