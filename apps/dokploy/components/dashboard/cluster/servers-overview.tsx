"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SwitchoverPrimaryDialog } from "./switchover-primary-dialog";
import { AlertCircle, Globe, Shield } from "lucide-react";

interface Server {
	id: string;
	name: string;
	ipAddress: string;
	tailscaleIp?: string;
	isPrimary: boolean;
	serverStatus: "active" | "inactive";
}

interface ServersOverviewProps {
	servers: Server[];
	onSwitchover?: (newPrimaryId: string) => Promise<void>;
	loading?: boolean;
}

export function ServersOverview({
	servers,
	onSwitchover,
	loading = false,
}: ServersOverviewProps) {
	const [switchoverOpen, setSwitchoverOpen] = useState(false);
	const primaryServer = servers.find((s) => s.isPrimary);

	return (
		<>
			<Card>
				<CardHeader>
					<CardTitle>Cluster Servers</CardTitle>
					<CardDescription>
						Manage replication and failover across multiple servers
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{servers.length === 0 ? (
						<div className="text-center py-8 text-muted-foreground">
							<p>No servers configured yet</p>
						</div>
					) : (
						<>
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{servers.map((server) => (
									<Card key={server.id} className="border-2">
										<CardHeader className="pb-3">
											<div className="flex items-start justify-between">
												<div className="flex-1">
													<CardTitle className="text-base flex items-center gap-2">
														{server.name}
														{server.isPrimary ? (
															<Badge variant="default">Primary</Badge>
														) : (
															<Badge variant="secondary">Replica</Badge>
														)}
													</CardTitle>
													<CardDescription className="text-xs mt-1">
														Status:{" "}
														<Badge
															variant={
																server.serverStatus === "active"
																	? "outline"
																	: "destructive"
															}
														>
															{server.serverStatus}
														</Badge>
													</CardDescription>
												</div>
											</div>
										</CardHeader>
										<CardContent className="space-y-2 text-sm">
											<div className="flex items-center gap-2">
												<Globe className="w-4 h-4 text-muted-foreground" />
												<span className="font-mono">{server.ipAddress}</span>
											</div>
											{server.tailscaleIp && (
												<div className="flex items-center gap-2">
													<Shield className="w-4 h-4 text-muted-foreground" />
													<span className="font-mono text-blue-600">
														{server.tailscaleIp}
													</span>
												</div>
											)}
										</CardContent>
									</Card>
								))}
							</div>

							{primaryServer && servers.filter((s) => !s.isPrimary).length > 0 && (
								<div className="mt-6 pt-4 border-t">
									<div className="flex items-start gap-3 mb-4">
										<AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
										<div className="text-sm">
											<p className="font-semibold mb-1">Failover</p>
											<p className="text-muted-foreground">
												If the primary server ({primaryServer.name}) becomes
												unavailable, you can promote a replica server as the new
												primary.
											</p>
										</div>
									</div>
									<Button
										onClick={() => setSwitchoverOpen(true)}
										variant="outline"
										disabled={loading}
									>
										Switch Primary Server
									</Button>
								</div>
							)}
						</>
					)}
				</CardContent>
			</Card>

			{primaryServer && (
				<SwitchoverPrimaryDialog
					open={switchoverOpen}
					onOpenChange={setSwitchoverOpen}
					currentPrimary={primaryServer}
					availableServers={servers}
					onSwitchover={onSwitchover || (async () => {})}
					loading={loading}
				/>
			)}
		</>
	);
}
