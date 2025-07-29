# 🌐 sddao-v1

> **P2P chat application using The Open Network (TON)**

[![Go Version](https://img.shields.io/badge/Go-1.23+-blue.svg)](https://golang.org)

🎥 Watch video demo on [PeerList](https://peerlist.io/designervoid/project/sddao)

## Dependencies

This project uses the following open-source libraries:

- [`tonutils-go`](https://github.com/xssnick/tonutils-go) – Provides core TON networking primitives including ADNL, DHT, and RLDP, enabling true P2P connectivity and message delivery.

## ✨ Features

🔒 True P2P Communication – Direct peer-to-peer messaging without central servers.

📡 Large Message Support – Delivery of encrypted messages up to 10MB.

🔐 End-to-End Encryption – Messages secured with one-time ed25519 keys.

⚙️ Cross-Platform – Data can be exchanged wirelessly between macOS and Android over Wi-Fi (see how it [works](https://peerlist.io/designervoid/project/sddao), this repo contains only the Linux build).

👁️‍🗨️ No tracking – We’re not watching you.

## 🚀 Quick Start

### Prerequisites
- Go 1.23 or higher
- cosign (to verify builder email)

### Install `config.json`

Download TON Mainnet Config (https://ton.org/global-config.json) to `config.json` in directory with binary 

### Running Nodes

```bash
# Start first node (Alice)
./sddao-p2p-0.0.2-aarch64 Alice <ip> <port>

# Start second node (Bob) 
./sddao-p2p-0.0.2-aarch64 Bob <ip> <port>
```


## Verify builder email via `cosign`

Should return `Verified OK`:
```sh
# verify dsgnrvd@gmail.com
cosign verify-blob \
  --signature sddao-p2p-0.0.2-aarch64.sig \
  --certificate sddao-p2p-0.0.2-aarch64.crt \
  --bundle sddao-p2p-0.0.2-aarch64.bundle \
  --certificate-identity "dsgnrvd@gmail.com" \
  --certificate-oidc-issuer "https://github.com/login/oauth" \
  sddao-p2p-0.0.2-aarch64
```

## 📋 Available Commands

Once your node is running, use these interactive commands:

| Command | Description | Example |
|---------|-------------|---------|
| `/connect <key>` | Connect to peer via DHT using public key | `/connect a1b2c3d4...` |
| `/msg <key> <text>` | Send message via RLDP | `/msg a1b2c3d4... Hello!` |
| `/list` | Show connected peers | `/list` |
| `/exit` | Exit the application | `/exit` |

## 🌍 Network Connectivity

### IP Address Considerations

| Connection Type | Status | Description |
|----------------|--------|-------------|
| **Public + Public** | ✅ Good | Both nodes have public IPs |
| **Private + Private** | ✅ Good | Both nodes on same local network |

### Network Requirements

- **Public IPs** - Recommended for global connectivity
- **Local Network** - Works well for private deployments

## 📖 Example Usage

### Linux

1. **Start Alice Node**
   ```bash
   ./sddao-p2p-0.0.2-aarch64 Alice 127.0.0.0 8080
   ```
   *Output: Alice's public key will be displayed*

2. **Start Bob Node**
   ```bash
   ./sddao-p2p-0.0.2-aarch64 Bob 127.0.0.0 8081
   ```
   *Output: Bob public key will be displayed*

3. **Establish Connection**  

   In Alice terminal:
   ```bash
   /connect <Bob_public_key>
   ```

   In Bob terminal:
   ```bash
   /connect <Alice_public_key>
   ```

4. **Send Messages**
   ```bash
   # From Bob to Alice
   /msg <Alice_public_key> Hello Alice!
   
   # From Alice to Bob  
   /msg <Bob_public_key> Hi Bob!
   ```

### Android

Use [Termux](https://termux.dev/en/).

Inside `termux` you should have `wget` & `git`.  

Run sddao-v1 directly on your Android phone using Termux – a lightweight Linux environment and terminal emulator for Android.  

```sh
git clone git@github.com:systemdesigndao/sddao-v1-builds-public.git 

cd sddao-v1-builds-public 

wget https://ton.org/global-config.json -O config.json

chmod +x sddao-p2p-0.0.2-aarch64

./sddao-p2p-0.0.2-aarch64 <name> <ip> <port>

# connect then exchange messages
```

### Security Features

- **Key Generation** - Each node generates unique ed25519 key pair
- **Message Encryption** - All traffic encrypted end-to-end

### Performance Characteristics

- **Message Size** - Up to 10MB per message
- **Latency** - Sub-second message delivery

**Built on TON**
