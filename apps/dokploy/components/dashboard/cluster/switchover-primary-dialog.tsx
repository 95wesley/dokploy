"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { AlertCircle, Loader } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Server {
	id: string;
	name: string;
	isPrimary: boolean;
}

interface SwitchoverPrimaryDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	currentPrimary: Server | null;
	availableServers: Server[];
	onSwitchover: (newPrimaryId: string) => Promise<void>;
	loading?: boolean;
}

export function SwitchoverPrimaryDialog({
	open,
	onOpenChange,
	currentPrimary,
	availableServers,
	onSwitchover,
	loading = false,
}: SwitchoverPrimaryDialogProps) {
	const [selectedServerId, setSelectedServerId] = useState<string>("");
	const [isLoading, setIsLoading] = useState(false);

	const secondaryServers = availableServers.filter((s) => !s.isPrimary);

	const handleSwitchover = async () => {
		if (!selectedServerId || selectedServerId === currentPrimary?.id) {
			return;
		}

		setIsLoading(true);
		try {
			await onSwitchover(selectedServerId);
			onOpenChange(false);
			setSelectedServerId("");
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-md">
				<DialogHeader>
					<DialogTitle>Switch Primary Server</DialogTitle>
					<DialogDescription>
						Promote a replica to become the new primary server. This action will:
						<ul className="list-disc list-inside mt-2 space-y-1 text-sm">
							<li>Promote the selected replica to primary</li>
							<li>Demote the current primary to replica</li>
							<li>Update all connections to the new primary</li>
						</ul>
					</DialogDescription>
				</DialogHeader>

				<Alert variant="destructive">
					<AlertCircle className="h-4 w-4" />
					<AlertDescription>
						This operation will cause a brief service interruption (~30 seconds).
						Ensure no critical operations are running.
					</AlertDescription>
				</Alert>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label className="text-sm font-medium">Current Primary</Label>
						<div className="p-3 bg-muted rounded-md text-sm">
							<span className="font-semibold">{currentPrimary?.name}</span>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="new-primary" className="text-sm font-medium">
							New Primary
						</Label>
						{secondaryServers.length === 0 ? (
							<p className="text-sm text-muted-foreground">
								No replica servers available for switchover.
							</p>
						) : (
							<Select value={selectedServerId} onValueChange={setSelectedServerId}>
								<SelectTrigger id="new-primary">
									<SelectValue placeholder="Select a replica server..." />
								</SelectTrigger>
								<SelectContent>
									{secondaryServers.map((server) => (
										<SelectItem key={server.id} value={server.id}>
											{server.name} (Replica)
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button
						variant="outline"
						onClick={() => onOpenChange(false)}
						disabled={isLoading || loading}
					>
						Cancel
					</Button>
					<Button
						onClick={handleSwitchover}
						disabled={!selectedServerId || isLoading || loading}
						variant="destructive"
					>
						{isLoading || loading ? (
							<>
								<Loader className="w-4 h-4 mr-2 animate-spin" />
								Switching...
							</>
						) : (
							"Switch Primary"
						)}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
