import { execAsyncRemote } from "@dokploy/server/utils/process/execAsync";

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

		const ip = (typeof output === "string" ? output : output?.stdout || "").trim();
		if (ip && ip.startsWith("100.")) {
			onData?.(`Found Tailscale IP: ${ip} ✅`);
			return ip;
		}

		onData?.(`Tailscale not connected or not found`);
		return null;
	} catch (error) {
		onData?.(`Error detecting Tailscale IP: ${error}`);
		return null;
	}
}

export async function isTailscaleInstalled(
	serverId: string,
	onData?: (msg: string) => void,
): Promise<boolean> {
	try {
		await execAsyncRemote(serverId, "command -v tailscale", onData);
		return true;
	} catch {
		return false;
	}
}

export async function getTailscaleStatus(
	serverId: string,
	onData?: (msg: string) => void,
): Promise<{
	installed: boolean;
	connected: boolean;
	ip?: string;
}> {
	const installed = await isTailscaleInstalled(serverId, onData);

	if (!installed) {
		return { installed: false, connected: false };
	}

	const ip = await detectTailscaleIp(serverId, onData);

	return {
		installed: true,
		connected: !!ip,
		ip: ip || undefined,
	};
}

export async function useSwarmAdvertiseAddr(
	serverId: string,
	useTailscale = true,
	onData?: (msg: string) => void,
): Promise<string | null> {
	if (!useTailscale) {
		onData?.(`Using public IP for Swarm advertise address`);
		return null;
	}

	const tailscaleIp = await detectTailscaleIp(serverId, onData);

	if (tailscaleIp) {
		onData?.(
			`Using Tailscale IP ${tailscaleIp} for Swarm advertise address`,
		);
		return tailscaleIp;
	}

	onData?.(
		`Tailscale not available, falling back to public IP`,
	);
	return null;
}
