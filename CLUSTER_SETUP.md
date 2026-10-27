# Dokploy Cluster Setup Guide

## Overview

The Dokploy Cluster feature enables you to replicate services (databases, applications, etc.) across multiple servers with automatic master-slave synchronization and manual failover capabilities.

## Architecture

```
┌─────────────────────────────────────────┐
│  Dokploy Control Plane                  │
│  (UI + API + Database)                  │
├─────────────────────────────────────────┤
│  VPS1 (Primary)    VPS2 (Replica)       │
│  ├─ Service A      ├─ Service A         │
│  ├─ DB Master      ├─ DB Slave          │
│  └─ Tailscale IP   └─ Tailscale IP      │
└─────────────────────────────────────────┘
```

## Setup Steps

### 1. Add Servers with Tailscale (Phase 1)

1. **Go to Settings → Servers**
2. **Click "Add Server"**
3. **Fill in SSH details:**
   - Name: `vps-1-primary`
   - IP Address: `203.0.113.1`
   - SSH Port: `22`
   - Username: `root`
   - SSH Key: (select or create)

4. **Enable Tailscale (optional but recommended):**
   - Check "Install Tailscale"
   - This creates a private network between servers
   - Private IP (10.x.x.x) is used for replication traffic

5. **Mark as Primary:**
   - Check "Set as Primary Server"

6. **Repeat for replica servers** (VPS2, VPS3, etc.)

### 2. Create a Service with Replication (Phase 2)

#### Example: PostgreSQL Database

1. **Go to Project → Environment → Databases → Add PostgreSQL**
2. **Fill basic details:**
   - Name: `production-db`
   - Database Name: `my_app`
   - Root Password: (secure password)

3. **Execution Mode:**
   - Choose **"Replicated"** instead of "Single Server"
   - Select servers:
     - ✓ `vps-1-primary` (Primary)
     - ✓ `vps-2-replica` (Replica)
     - ✓ `vps-3-replica` (Replica)

4. **Click "Create Database"**

#### What Happens Automatically:

- PostgreSQL Master starts on `vps-1-primary`
- PostgreSQL Slave starts on `vps-2-replica` and `vps-3-replica`
- Replication is configured automatically:
  - Slaves connect to Master via Tailscale IP (or Public IP)
  - Write-Ahead Log (WAL) streaming begins
  - Data syncs continuously

5. **Verify Replication:**
   - Go to Database → Status
   - See `Master: vps-1-primary ✓`
   - See `Slave: vps-2-replica (Syncing)`
   - See `Slave: vps-3-replica (Syncing)`

### 3. Check Replication Status

**Dashboard → Cluster:**
- Green checkmark = Synced
- Spinning icon = Syncing
- Red X = Error
- Click server to see last sync time

### 4. Switchover (Failover Manual)

If your primary server goes down:

1. **Go to Dashboard → Cluster → Servers**
2. **Click "Switch Primary Server"**
3. **Select new primary** (e.g., `vps-2-replica`)
4. **Confirm** (this takes ~30 seconds)

What happens:
- `vps-2-replica` is promoted to Master
- `vps-1-primary` is demoted to Slave (can be restored later)
- All services redirect to new primary
- Applications reconnect automatically

## Service Types Supported

| Service | Replication Type | Status |
|---------|------------------|--------|
| PostgreSQL | Native WAL Streaming | ✅ Ready |
| MySQL / MariaDB | Master-Slave | ✅ Ready |
| Redis | SLAVEOF | ✅ Ready |
| Mongo | Replica Set | ⏳ Planned |
| Applications | Stateless (Swarm) | ✅ Ready |

## Network Configuration

### Tailscale Mode (Recommended)

**Pros:**
- Encrypted private network
- No firewall configuration needed
- Automatic IP assignment
- Works across different networks

**Setup:**
- Enable "Install Tailscale" when adding server
- Tailscale IPs (10.0.0.x) used for replication
- Public IPs used for external traffic

### Public IP Mode

**Pros:**
- No additional VPN needed
- Direct routing

**Cons:**
- Expose replication traffic to internet
- Need to open ports 3306 (MySQL), 5432 (Postgres), etc.

## Troubleshooting

### Replication Shows "Error"

1. **Check server connectivity:**
   ```bash
   ssh -i <key> root@vps-2 ping <vps-1-private-ip>
   ```

2. **Check replication status on Master:**
   ```bash
   # PostgreSQL
   docker exec dokploy-postgres psql -U postgres -c "SELECT * FROM pg_stat_replication;"
   
   # MySQL
   docker exec dokploy-mysql mysql -e "SHOW MASTER STATUS;"
   ```

3. **Check Slave status:**
   ```bash
   # PostgreSQL
   docker logs dokploy-postgres | grep -i replication
   
   # MySQL
   docker exec dokploy-mysql mysql -e "SHOW SLAVE STATUS\G"
   ```

### Services Not Syncing

1. Check firewall allows:
   - PostgreSQL: 5432
   - MySQL: 3306
   - Redis: 6379
   - Tailscale: UDP 41641

2. Verify Tailscale is installed:
   ```bash
   ssh root@vps-2 tailscale ip
   ```

3. Redeploy service to reinitialize replication:
   - Dashboard → Service → Redeploy

### Manual Replication Recovery

If automatic replication fails, you can manually sync:

```bash
# PostgreSQL: Full resync
docker exec dokploy-postgres pg_basebackup -h <primary-ip> -D /var/lib/postgresql/data -U replication

# MySQL: Full resync
docker exec dokploy-mysql mysqldump -u root -p<password> --all-databases | docker exec -i dokploy-mysql mysql -u root -p<password>
```

## Best Practices

### 1. Always Have 3 Nodes for HA

- Primary (Master)
- Replica 1
- Replica 2 (can survive loss of 1 replica)

### 2. Monitor Replication Lag

Use the dashboard to check:
- Last sync times
- Replication status
- Error messages

### 3. Test Failover Regularly

1. Simulate primary failure:
   ```bash
   ssh root@vps-1 docker stop dokploy-postgres
   ```

2. Promote replica:
   - Dashboard → Switch Primary

3. Verify applications reconnect

4. Restore original primary:
   - Dashboard → Redeploy

### 4. Backup Strategy

- Regular backups still required
- Replication ≠ Backup (deleted data replicates too)
- Use S3/destination backup in addition

### 5. Network Security

- Use Tailscale for private replication
- Restrict public IPs to application only
- Firewall: Allow replication only from cluster nodes

## Performance Considerations

| Scenario | Impact | Mitigation |
|----------|--------|------------|
| High-traffic writes | 10-20% latency increase | SSD for replica, tune replication |
| Large databases | Longer initial sync | Sync during low traffic |
| WAN links | Replication lag | Use compression, tune flush interval |

## Limitations & Roadmap

### Current (Phase 1-4)

✅ Master-slave replication
✅ Manual failover
✅ Postgres, MySQL, Redis support
✅ Tailscale integration

### Coming (Phase 5+)

- ⏳ Automatic failover with health checks
- ⏳ Read replicas load balancing
- ⏳ Multi-master (Galera for MySQL)
- ⏳ Postgres streaming WAL archiving
- ⏳ Volume replication (for stateful services)

## API Usage

### Create Service with Replication

```bash
curl -X POST http://localhost:3000/api/trpc/postgres.create \
  -H "Content-Type: application/json" \
  -d '{
    "environmentId": "env-123",
    "name": "production-db",
    "databaseName": "myapp",
    "databaseUser": "postgres",
    "databasePassword": "secure-password",
    "executionMode": "replicated",
    "primaryServerId": "vps-1",
    "replicaServerIds": ["vps-2", "vps-3"]
  }'
```

### Switch Primary

```bash
curl -X POST http://localhost:3000/api/trpc/cluster.switchoverPrimary \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "db-123",
    "serviceType": "postgres",
    "newPrimaryServerId": "vps-2"
  }'
```

### Get Service Servers

```bash
curl -X GET "http://localhost:3000/api/trpc/cluster.getServiceServers?serviceId=db-123&serviceType=postgres" \
  -H "Content-Type: application/json"
```

## Support

For issues or questions:
1. Check logs: `Dashboard → Logs & Metrics`
2. Check server health: `Dashboard → Cluster → Servers`
3. Review replication status: `Database → Status`

## Related Documentation

- [Tailscale Setup](https://tailscale.com/docs/install)
- [PostgreSQL Replication](https://www.postgresql.org/docs/current/warm-standby.html)
- [MySQL Replication](https://dev.mysql.com/doc/refman/8.0/en/replication.html)
- [Redis Replication](https://redis.io/docs/latest/operate/oss_and_stack/management/replication/)
