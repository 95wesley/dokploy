# 🚀 Dokploy Cluster Configuration

## 1. Add Servers

### Via UI:
```
Settings → Servers → Add Server
```

**Required data:**
- **Name**: Unique name (e.g., `vps-1`, `vps-2`)
- **IP Address**: VPS IP or hostname (e.g., `192.168.1.100` or `vps1.example.com`)
- **Port**: 22 (SSH)
- **Username**: `root`
- **SSH Key**: Select or create one

**Mark as Primary:**
- ✅ `Mark as Primary Server` (only 1 server)

---

## 2. Create Replicated Service

### Example: PostgreSQL Database

```
Dashboard → [Project] → Databases → Add PostgreSQL
```

**Setup:**
- **Name**: `production-db`
- **Database Name**: `myapp`
- **Password**: `strong-password`
- **Execution Mode**: ⭕ **Replicated**

**Select Servers:**
- ✅ `vps-1` (Primary/Master)
- ✅ `vps-2` (Secondary/Slave)
- ✅ `vps-3` (Secondary/Slave - optional)

**Click: Create Database**

---

## 3. Monitor Replication

```
Dashboard → Cluster → Servers
```

You will see:
```
┌─ vps-1 (PRIMARY)
│  ├─ PostgreSQL: ✅ Synced (Master)
│  ├─ Last sync: 2026-10-27 10:30:45
│  └─ Status: Master
│
├─ vps-2 (SECONDARY)
│  ├─ PostgreSQL: ✅ Syncing (Slave)
│  └─ Status: Slave
│
└─ vps-3 (SECONDARY)
   ├─ PostgreSQL: ✅ Synced (Slave)
   └─ Status: Slave
```

---

## 4. Failover (Switch Primary)

```
Dashboard → Cluster → Servers → "Switch Primary"
```

**Select new primary:**
- Dropdown: `vps-2`
- Click: "Switch Primary"

**What happens:**
1. ✅ vps-2 becomes **Master**
2. ✅ vps-1 becomes **Slave**
3. ✅ DNS points to vps-2
4. ✅ Apps redirect automatically (~30s downtime)

---

## 5. Replicated Applications

```
Dashboard → [Project] → Applications → Add Application
```

**Setup:**
- **Name**: `api-service`
- **Framework**: Node.js / Python / etc
- **Execution Mode**: ⭕ **Replicated**

**Select Servers:**
- ✅ vps-1 (Primary)
- ✅ vps-2 (Secondary)

**Result:**
- App runs on both nodes
- Load balancer distributes requests
- If vps-1 fails, vps-2 continues serving

---

## 6. Supported Service Types

| Type | Replication | Status |
|------|-----------|--------|
| **PostgreSQL** | Master-Slave (WAL) | ✅ Implemented |
| **MySQL** | Master-Slave (CHANGE MASTER) | ✅ Implemented |
| **MariaDB** | Master-Slave | ✅ Implemented |
| **Redis** | Master-Slave (SLAVEOF) | ✅ Implemented |
| **MongoDB** | Replica Set | ✅ Implemented |
| **Application** | Swarm Replicas | ✅ Implemented |
| **Compose** | Multi-node | ✅ Implemented |

---

## 7. Quick Verification

**Via SSH on primary server:**

```bash
# PostgreSQL
psql -U dokploy -c "SELECT slot_name, restart_lsn FROM pg_replication_slots;"

# MySQL
mysql -e "SHOW SLAVE STATUS\G"

# Redis
redis-cli INFO replication
```

**Via Dokploy CLI (future):**
```bash
dokploy cluster status
dokploy cluster failover --to vps-2
```

---

## ⚠️ Current Limitations

- ❌ Volumes/Storage don't replicate (data only)
- ❌ Failover is manual (not automatic)
- ❌ No automatic health checks

---

## 🎯 Typical Workflow

```
1. Create 3 VPS with SSH configured
   ↓
2. Add in Settings → Servers (1 primary)
   ↓
3. Create database with "Replicated" mode
   ↓
4. Monitor sync in Dashboard → Cluster
   ↓
5. When ready, perform failover with "Switch Primary"
```

---

## 📞 Support

**Replication error?**
- Check SSH connectivity: `ssh root@vps-ip`
- View logs: `Dashboard → Logs → [server]`
- Test firewall: `telnet vps-ip 5432` (PostgreSQL)
