"use client";

import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Clock, Loader } from "lucide-react";
import type { ReactNode } from "react";

export type ReplicationStatus = "synced" | "syncing" | "error" | "pending";

interface ReplicationStatusProps {
	status: ReplicationStatus;
	error?: string;
	lastSynced?: Date;
	serverName: string;
	isPrimary?: boolean;
}

const statusConfig: Record<
	ReplicationStatus,
	{ icon: ReactNode; label: string; color: string }
> = {
	synced: {
		icon: <CheckCircle className="w-4 h-4" />,
		label: "Synced",
		color: "bg-green-500",
	},
	syncing: {
		icon: <Loader className="w-4 h-4 animate-spin" />,
		label: "Syncing",
		color: "bg-blue-500",
	},
	error: {
		icon: <AlertCircle className="w-4 h-4" />,
		label: "Error",
		color: "bg-red-500",
	},
	pending: {
		icon: <Clock className="w-4 h-4" />,
		label: "Pending",
		color: "bg-yellow-500",
	},
};

export function ReplicationStatus({
	status,
	error,
	lastSynced,
	serverName,
	isPrimary = false,
}: ReplicationStatusProps) {
	const config = statusConfig[status];

	return (
		<div className="flex items-center gap-2 p-2 border rounded bg-muted/50">
			<div className="flex items-center gap-2 flex-1">
				<div className={`${config.color} text-white rounded-full p-1`}>
					{config.icon}
				</div>
				<div className="flex-1">
					<div className="flex items-center gap-2">
						<span className="text-sm font-medium">{serverName}</span>
						{isPrimary && (
							<Badge variant="outline" className="text-xs">
								Master
							</Badge>
						)}
						{!isPrimary && (
							<Badge variant="secondary" className="text-xs">
								Replica
							</Badge>
						)}
					</div>
					<p className="text-xs text-muted-foreground">
						Status: <span className="font-semibold">{config.label}</span>
						{lastSynced && (
							<>
								{" "}
								• Last sync:{" "}
								{new Date(lastSynced).toLocaleTimeString()}
							</>
						)}
					</p>
					{error && (
						<p className="text-xs text-red-600 mt-1">{error}</p>
					)}
				</div>
			</div>
		</div>
	);
}
