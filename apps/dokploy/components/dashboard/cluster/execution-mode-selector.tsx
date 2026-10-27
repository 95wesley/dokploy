"use client";

import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import type { ReactNode } from "react";

export type ExecutionMode = "single" | "replicated";

interface ExecutionModeSelectorProps {
	value: ExecutionMode;
	onChange: (mode: ExecutionMode) => void;
	servers: Array<{ id: string; name: string; isPrimary?: boolean }>;
	selectedServers?: string[];
	onServersChange?: (servers: string[]) => void;
	disabled?: boolean;
	description?: ReactNode;
}

export function ExecutionModeSelector({
	value,
	onChange,
	servers,
	selectedServers = [],
	onServersChange,
	disabled = false,
	description,
}: ExecutionModeSelectorProps) {
	return (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label>Execution Mode</Label>
				{description && (
					<p className="text-sm text-muted-foreground">{description}</p>
				)}
			</div>

			<RadioGroup
				value={value}
				onValueChange={(v) => onChange(v as ExecutionMode)}
				disabled={disabled}
			>
				<div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
					<RadioGroupItem value="single" id="mode-single" />
					<Label htmlFor="mode-single" className="cursor-pointer flex-1">
						<span className="font-medium">Single Server</span>
						<p className="text-sm text-muted-foreground">
							Run on one server only
						</p>
					</Label>
				</div>

				<div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-accent cursor-pointer">
					<RadioGroupItem value="replicated" id="mode-replicated" />
					<Label htmlFor="mode-replicated" className="cursor-pointer flex-1">
						<span className="font-medium">Replicated</span>
						<p className="text-sm text-muted-foreground">
							Run on multiple servers with automatic replication
						</p>
					</Label>
				</div>
			</RadioGroup>

			{value === "single" && servers.length > 0 && (
				<div className="pl-4 space-y-2">
					<Label className="text-sm">Select Server</Label>
					<select
						className="w-full px-3 py-2 border rounded-md bg-background"
						disabled={disabled}
						onChange={(e) => onServersChange?.([e.target.value])}
						value={selectedServers[0] || ""}
					>
						<option value="">Choose a server...</option>
						{servers.map((server) => (
							<option key={server.id} value={server.id}>
								{server.name}
								{server.isPrimary ? " (Primary)" : ""}
							</option>
						))}
					</select>
				</div>
			)}

			{value === "replicated" && servers.length > 0 && (
				<div className="pl-4 space-y-3 p-3 bg-accent rounded-lg">
					<Label className="text-sm font-medium">Replicate on servers</Label>
					<div className="space-y-2">
						{servers.map((server) => (
							<div key={server.id} className="flex items-center gap-2">
								<input
									type="checkbox"
									id={`server-${server.id}`}
									checked={selectedServers.includes(server.id)}
									onChange={(e) => {
										if (e.target.checked) {
											onServersChange?.([...selectedServers, server.id]);
										} else {
											onServersChange?.(
												selectedServers.filter((id) => id !== server.id),
											);
										}
									}}
									disabled={disabled}
									className="rounded border-gray-300"
								/>
								<Label
									htmlFor={`server-${server.id}`}
									className="cursor-pointer font-normal"
								>
									{server.name}
									{server.isPrimary && (
										<Badge variant="outline" className="ml-2">
											Primary
										</Badge>
									)}
								</Label>
							</div>
						))}
					</div>
					{selectedServers.length > 0 && (
						<p className="text-xs text-muted-foreground">
							{selectedServers.length} server{selectedServers.length !== 1 ? "s" : ""} selected
							{servers.find((s) => s.isPrimary && selectedServers.includes(s.id))
								? " (includes primary)"
								: " (add primary for replication)"}
						</p>
					)}
				</div>
			)}
		</div>
	);
}
