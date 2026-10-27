# Testing Cluster Feature

## Quick Start (Local Development)

### Prerequisites
- Node 26+
- pnpm 10.22+
- PostgreSQL 16+ (via Homebrew)
- Redis 7+ (via Homebrew)

### Installation

```bash
# Install dependencies
pnpm install

# Install PostgreSQL and Redis via Homebrew
brew install postgresql@16 redis
```

### Start Development

```bash
# Make script executable (first time only)
chmod +x start_dev.sh

# Run everything with one command
./start_dev.sh
```

**URL**: http://localhost:3000  
**Database**: postgresql://postgres:postgres@localhost:5432/dokploy  
**Redis**: redis://localhost:6379

The script will:
1. ✅ Start PostgreSQL via `brew services`
2. ✅ Start Redis via `brew services`
3. ✅ Create the `dokploy` database
4. ✅ Run migrations automatically
5. ✅ Start the development server at http://localhost:3000

---

## Testing the Cluster Feature

### 1. Access Dokploy UI

```
http://localhost:3000
```

Login with default credentials (check `.env` or setup wizard)

### 2. Add Two Test Servers

**Settings → Servers → Add Server**

**Server 1 (Primary):**
- Name: `test-vps-1`
- IP Address: `192.168.1.100` (or your test VPS IP)
- Port: 22
- Username: `root`
- SSH Key: (select or create)
- ✅ Mark as Primary Server

**Server 2 (Replica):**
- Name: `test-vps-2`
- IP Address: `192.168.1.101` (or your test VPS IP)
- Port: 22
- Username: `root`
- SSH Key: (select or create)

### 3. Create a PostgreSQL Database with Replication

**Dashboard → Project → Environment → Databases → Add PostgreSQL**

**Setup:**
- Name: `production-db`
- Database Name: `myapp`
- Root Password: `secure-password`
- Execution Mode: **Replicated** ← NEW FEATURE
- Select Servers:
  - ✅ `test-vps-1` (Primary)
  - ✅ `test-vps-2` (Replica)

**Click "Create Database"**

### 4. Monitor Replication Status

**Dashboard → Cluster → Servers**

You should see:
```
test-vps-1 (Primary) 
  ├─ PostgreSQL: ✅ Synced
  ├─ Status: Master
  └─ Last sync: 2025-10-26 15:30:45

test-vps-2 (Replica)
  ├─ PostgreSQL: ✅ Syncing
  ├─ Status: Slave  
  └─ Last sync: 2025-10-26 15:30:42
```

### 5. Test Manual Failover

**Dashboard → Cluster → Servers → "Switch Primary Server"**

1. Select: `test-vps-2` as new primary
2. Click: "Switch Primary"
3. Monitor: Status changes (takes ~30s)

**Expected Result:**
- PostgreSQL on `test-vps-2` promoted to Master
- PostgreSQL on `test-vps-1` demoted to Slave
- All applications redirect to new primary
- DNS points to new primary IP

### 6. Test Application Replication

**Dashboard → Project → Environment → Applications → Add Application**

**Setup:**
- Name: `api-service`
- Framework: Node.js / Python / etc
- Execution Mode: **Replicated** ← NEW FEATURE
- Select Servers:
  - ✅ `test-vps-1` (Primary)
  - ✅ `test-vps-2` (Replica)

**Expected:**
- App deployed to both servers
- Load balanced automatically
- If test-vps-1 fails, app still runs on test-vps-2

---

## Verification Checklist

- [ ] PostgreSQL Master-Slave sync visible in Dashboard
- [ ] Replication status shows "Synced"
- [ ] Switchover button appears when replica is available
- [ ] Switchover completes without errors
- [ ] New primary serves all requests
- [ ] Applications run on both servers
- [ ] No data loss during failover

---

## Troubleshooting

### "Replication Error: Connection timeout"
- Verify SSH key is correct
- Check firewall allows ports 3306 (MySQL), 5432 (Postgres)
- Check server health in Dashboard

### "Services not syncing"
- Check server status: Dashboard → Cluster
- Redeploy service: Application → Redeploy
- View logs: Docker logs on each server

---

## Stopping Services

To stop the development server and services:

```bash
# Stop just the dev server (Ctrl+C in terminal running ./start_dev.sh)

# Stop all services
brew services stop postgresql@16
brew services stop redis
```

---

## Architecture Tested

```
┌─────────────────────────────────────┐
│  Dokploy (Local: localhost:3000)    │
├─────────────────────────────────────┤
│  PostgreSQL: localhost:5432         │
│  Redis: localhost:6379              │
└─────────────────────────────────────┘
         ↓ (via SSH)
┌─────────────────────────────────────┐
│  Test VPS 1 (Primary: 192.168.1.100)│
│  ├─ Docker Swarm                    │
│  ├─ PostgreSQL Master               │
│  └─ Services (replicated)           │
└─────────────────────────────────────┘
         ↓ (Master-Slave)
┌─────────────────────────────────────┐
│  Test VPS 2 (Replica: 192.168.1.101)│
│  ├─ Docker Swarm                    │
│  ├─ PostgreSQL Slave                │
│  └─ Services (replicated)           │
└─────────────────────────────────────┘
```

---

## Branch & Code

**Branch**: `feature/cluster-replication-simple`

**Key Files Modified:**
- `packages/server/src/db/schema/server.ts` - Server schema with SSH configuration
- `packages/server/src/db/schema/service-servers.ts` - Junction table for replication
- `packages/server/src/utils/replication/setup-replication.ts` - Replication logic via SSH
- `apps/dokploy/components/dashboard/cluster/` - UI components
- `apps/dokploy/server/api/routers/cluster.ts` - API endpoints
- `CLUSTER_CONFIG.md` - Complete setup guide

---

## Support

For issues or questions:
1. Check `CLUSTER_SETUP.md` for detailed documentation
2. Review test outputs in Docker logs
3. Verify typecheck: `pnpm typecheck`
4. Run tests: `pnpm -F dokploy test`
