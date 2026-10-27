# 🚀 Configuração de Cluster no Dokploy

## 1. Adicionar Servidores

### Via UI:
```
Settings → Servers → Add Server
```

**Dados necessários:**
- **Name**: Nome único (ex: `vps-1`, `vps-2`)
- **IP Address**: IP do VPS ou hostname (ex: `192.168.1.100` ou `vps1.example.com`)
- **Port**: 22 (SSH)
- **Username**: `root`
- **SSH Key**: Selecione ou crie uma

**Marque como Primário:**
- ✅ `Mark as Primary Server` (apenas 1 servidor)

---

## 2. Criar Serviço com Replicação

### Exemplo: Banco de Dados PostgreSQL

```
Dashboard → [Projeto] → Databases → Add PostgreSQL
```

**Setup:**
- **Name**: `production-db`
- **Database Name**: `myapp`
- **Password**: `strong-password`
- **Execution Mode**: ⭕ **Replicated**

**Selecione Servidores:**
- ✅ `vps-1` (Primário/Master)
- ✅ `vps-2` (Secundário/Slave)
- ✅ `vps-3` (Secundário/Slave - opcional)

**Click: Create Database**

---

## 3. Monitorar Replicação

```
Dashboard → Cluster → Servers
```

Você verá:
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

## 4. Failover (Trocar Primário)

```
Dashboard → Cluster → Servers → "Switch Primary"
```

**Selecione o novo primário:**
- Dropdown: `vps-2`
- Click: "Switch Primary"

**O que acontece:**
1. ✅ vps-2 vira **Master**
2. ✅ vps-1 vira **Slave**
3. ✅ DNS aponta para vps-2
4. ✅ Apps redirecionam automaticamente (~30s downtime)

---

## 5. Aplicações Replicadas

```
Dashboard → [Projeto] → Applications → Add Application
```

**Setup:**
- **Name**: `api-service`
- **Framework**: Node.js / Python / etc
- **Execution Mode**: ⭕ **Replicated**

**Selecione Servidores:**
- ✅ vps-1 (Primário)
- ✅ vps-2 (Secundário)

**Resultado:**
- App roda em ambos os nós
- Load balancer distribui requisições
- Se vps-1 cair, vps-2 continua servindo

---

## 6. Tipos de Serviços Suportados

| Tipo | Replicação | Status |
|------|-----------|--------|
| **PostgreSQL** | Master-Slave (WAL) | ✅ Implemented |
| **MySQL** | Master-Slave (CHANGE MASTER) | ✅ Implemented |
| **MariaDB** | Master-Slave | ✅ Implemented |
| **Redis** | Master-Slave (SLAVEOF) | ✅ Implemented |
| **MongoDB** | Replica Set | ✅ Implemented |
| **Application** | Swarm Replicas | ✅ Implemented |
| **Compose** | Multi-node | ✅ Implemented |

---

## 7. Verificação Rápida

**Via SSH no servidor primário:**

```bash
# PostgreSQL
psql -U dokploy -c "SELECT slot_name, restart_lsn FROM pg_replication_slots;"

# MySQL
mysql -e "SHOW SLAVE STATUS\G"

# Redis
redis-cli INFO replication
```

**Via CLI Dokploy (futuro):**
```bash
dokploy cluster status
dokploy cluster failover --to vps-2
```

---

## ⚠️ Limitações Atuais

- ❌ Volumes/Storage não replicam (apenas dados)
- ❌ Failover é manual (não automático)
- ❌ Sem health checks automáticos

---

## 🎯 Workflow Típico

```
1. Criar 3 VPS com SSH configurado
   ↓
2. Adicionar em Settings → Servers (1 primário)
   ↓
3. Criar banco de dados com "Replicated" mode
   ↓
4. Monitorar sync em Dashboard → Cluster
   ↓
5. Quando pronto, fazer failover com "Switch Primary"
```

---

## 📞 Suporte

**Erro de replicação?**
- Verificar conectividade SSH: `ssh root@vps-ip`
- Ver logs: `Dashboard → Logs → [servidor]`
- Testar firewall: `telnet vps-ip 5432` (PostgreSQL)
