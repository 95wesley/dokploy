# Ubuntu WSL Setup - Dokploy via Tailscale

## 📋 Server Configuration

```
Name: wesley-wsl-ubuntu
IP Address: 100.107.161.67 (Tailscale)
Port: 22
Username: wesley
SSH Key: id_ed25519
```

## 🔑 SSH Key (Nova - Gerada especificamente)

**Private Key**: `~/.ssh/wesley-wsl-ubuntu` (keep local, never commit; paste its contents into Dokploy's SSH Keys form)

## 🚀 Steps in Dokploy

### 1. Add SSH Key
```
Settings → SSH Keys → Add SSH Key
Name: wesley-wsl-ubuntu-key
Type: Ed25519 Private Key
Paste the key above
```

### 2. Add Server
```
Settings → Servers → Add Server
Name: wesley-wsl-ubuntu
IP Address: 100.107.161.67
Port: 22
Username: wesley
SSH Key: wesley-wsl-ubuntu-key
```

### 3. Test Connection
Click "Test Connection" to verify SSH works

## ✅ Prerequisites on Ubuntu WSL

```bash
# 1. Add public key to authorized_keys
mkdir -p ~/.ssh
echo "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAII4s1vDpw+Bxw0a2rm+shiTFbUW81Rr7/XxPxa5ll+Y/ wesley@wsl-ubuntu" >> ~/.ssh/authorized_keys
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys

# 2. Ensure SSH server is running
sudo systemctl start ssh
sudo systemctl enable ssh

# 3. Ensure Tailscale is connected
sudo tailscale up --hostname=wesley-wsl-ubuntu

# 4. Verify your Tailscale IP
tailscale ip -4
# Should output: 100.107.161.67 (or similar)
```

## 🧪 Test Connection

```bash
# From Mac
ssh -i ~/.ssh/wesley-wsl-ubuntu wesley@100.107.161.67

# Or using SSH config alias (recommended)
ssh wesley-wsl-ubuntu
```

## 📝 Notes

- Tailscale IP: `100.107.161.67`
- Only accessible when Ubuntu WSL is running
- Only accessible when Tailscale is connected
- Private network - secure access from anywhere via Tailscale
