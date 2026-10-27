import { execAsyncRemote } from "@dokploy/server/utils/process/execAsync";
import { findServerById } from "@dokploy/server/services/server";
import type { z } from "zod";
import type {
	apiSwitchoverServicePrimary,
	serviceType,
} from "@dokploy/server/db/schema";

export async function setupPostgresReplication(
	primaryServerId: string,
	primaryIpAddress: string,
	replicaServerId: string,
	databaseUser: string,
	databaseName: string,
	onData?: (msg: string) => void,
) {
	onData?.(`Configuring PostgreSQL replication: ${replicaServerId}`);

	await execAsyncRemote(
		replicaServerId,
		`rm -rf /var/lib/postgresql/data/* /var/lib/postgresql/data/.* 2>/dev/null || true`,
		onData,
	);

	await execAsyncRemote(
		replicaServerId,
		`pg_basebackup -h ${primaryIpAddress} -U ${databaseUser} -D /var/lib/postgresql/data -Pv -W`,
		onData,
	);

	await execAsyncRemote(
		replicaServerId,
		`echo "primary_conninfo = 'host=${primaryIpAddress} user=${databaseUser} password=<password> dbname=${databaseName}'" >> /var/lib/postgresql/data/postgresql.conf`,
		onData,
	);

	onData?.(`PostgreSQL replica setup complete`);
}

export async function setupMysqlReplication(
	primaryServerId: string,
	primaryIpAddress: string,
	replicaServerId: string,
	rootPassword: string,
	onData?: (msg: string) => void,
) {
	onData?.(`Configuring MySQL replication: ${replicaServerId}`);

	await execAsyncRemote(
		primaryServerId,
		`docker exec dokploy-mysql mysql -uroot -p${rootPassword} -e "GRANT REPLICATION SLAVE ON *.* TO 'replication'@'%' IDENTIFIED BY 'replication_password';"`,
		onData,
	);

	await execAsyncRemote(
		primaryServerId,
		`docker exec dokploy-mysql mysql -uroot -p${rootPassword} -e "FLUSH BINARY LOGS; SHOW MASTER STATUS\\G;" > /tmp/master_status.txt`,
		onData,
	);

	await execAsyncRemote(
		replicaServerId,
		`docker exec dokploy-mysql mysql -uroot -p${rootPassword} -e "CHANGE MASTER TO MASTER_HOST='${primaryIpAddress}', MASTER_USER='replication', MASTER_PASSWORD='replication_password', MASTER_LOG_FILE='mysql-bin.000001', MASTER_LOG_POS=154; START SLAVE;"`,
		onData,
	);

	onData?.(`MySQL replica setup complete`);
}

export async function setupRedisReplication(
	primaryServerId: string,
	primaryIpAddress: string,
	replicaServerId: string,
	onData?: (msg: string) => void,
) {
	onData?.(`Configuring Redis replication: ${replicaServerId}`);

	await execAsyncRemote(
		replicaServerId,
		`docker exec dokploy-redis redis-cli SLAVEOF ${primaryIpAddress} 6379`,
		onData,
	);

	onData?.(`Redis replica setup complete`);
}

export async function promotePostgresReplica(
	replicaServerId: string,
	onData?: (msg: string) => void,
) {
	onData?.(`Promoting PostgreSQL replica: ${replicaServerId}`);

	await execAsyncRemote(
		replicaServerId,
		`docker exec dokploy-postgres pg_ctl promote -D /var/lib/postgresql/data`,
		onData,
	);

	onData?.(`PostgreSQL promoted to master`);
}

export async function promoteMysqlReplica(
	replicaServerId: string,
	onData?: (msg: string) => void,
) {
	onData?.(`Promoting MySQL replica: ${replicaServerId}`);

	await execAsyncRemote(
		replicaServerId,
		`docker exec dokploy-mysql mysql -e "STOP SLAVE; RESET MASTER;"`,
		onData,
	);

	onData?.(`MySQL promoted to master`);
}

export async function promoteRedisReplica(
	replicaServerId: string,
	onData?: (msg: string) => void,
) {
	onData?.(`Promoting Redis replica: ${replicaServerId}`);

	await execAsyncRemote(
		replicaServerId,
		`docker exec dokploy-redis redis-cli SLAVEOF NO ONE`,
		onData,
	);

	onData?.(`Redis promoted to master`);
}

export async function demoteMasterToReplica(
	oldMasterServerId: string,
	newMasterIpAddress: string,
	serviceType: string,
	onData?: (msg: string) => void,
) {
	onData?.(
		`Demoting ${serviceType} master to replica: ${oldMasterServerId}`,
	);

	if (serviceType === "postgres") {
		await execAsyncRemote(
			oldMasterServerId,
			`echo "primary_conninfo = 'host=${newMasterIpAddress}'" >> /var/lib/postgresql/data/postgresql.conf`,
			onData,
		);
	} else if (serviceType === "mysql" || serviceType === "mariadb") {
		await execAsyncRemote(
			oldMasterServerId,
			`docker exec dokploy-mysql mysql -e "CHANGE MASTER TO MASTER_HOST='${newMasterIpAddress}', MASTER_USER='replication', MASTER_PASSWORD='replication_password'; START SLAVE;"`,
			onData,
		);
	} else if (serviceType === "redis") {
		await execAsyncRemote(
			oldMasterServerId,
			`docker exec dokploy-redis redis-cli SLAVEOF ${newMasterIpAddress} 6379`,
			onData,
		);
	}

	onData?.(`Demotion complete`);
}
