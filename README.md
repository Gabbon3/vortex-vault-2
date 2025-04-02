# 🔐 Vortex Vault
Vortex Vault is a modern, cloud-based, zero-knowledge password manager designed to deliver true end-to-end security with a flexible, extensible, and fearsome architecture.

Written in Node.js, it is designed for advanced users, developers and anyone who wants complete control over their data without having to give up a usable interface.

> “Security is not a feature. It is the architecture.” – Vortex Vault

## ✨ Main features

- 🔒 **Real End-to-End Encryption**
AES-256-GCM with derivation of master key via Argon2id. No server-side readable data.
- 🧠 **Advanced Authentication System**
Full support for WebAuthn / passkey (via FIDO2) for passwordless login and secure device management.
- 🧩 **Modular and Typed Vaults**
Supports multiple types of content: logins, notes, cards, keys, .env files, connections (VPN, FTP, DB, etc.). <br>
Extensible architecture for new types.
- 🧪 **Custom Password Analyzer**
Proprietary password force analysis algorithm with pattern detection, entropy, and keyboard sequences. <br>
(Responsive and judgmental UI included).
- 🧬 **Safe Sessions with ECDH**
Temporary key system for localStorage encryption.
No keys used directly. No persistent unauthorized access.
- 🎨 **Thematic Interface**
Support for custom themes and contextual icon system.
Security is not only functional, it is also aesthetic.
- 🛡️ **Advanced Device Management**
Cross-platform login with granular authentication and remote revocation.
Locked devices require passkey verification, OTP or approval.
- 📁 **Backup & Recovery End-to-End**
Encrypted backups with derived key, recoverable via ECDH challenge.
Ability to export and securely archive.

## 🚀 Setup & Installation

### Requirements
- Node.js 18+
- Supabase / PostgreSQL

### Basic Setup
```bash
git clone https://github.com/Gabbon3/vortex-vault-2.git
cd vortex-vault-2
npm install
```
Be sure to configure the environment variables in the `.env` file following the available template.

### Local startup
```bash
npm run dev
```

## 📐 Technical architecture
```
Client (Browser)
│
├── WebAuthn + Passkey
├── Vault Encryption (AES-GCM)
├── Local Key Management (ECDH)
│
▼
Server (Node.js + Express)
├── REST API + Middleware
├── Device/Session DB Layer
├── No access to user data (zero knowledge)
│
▼
Storage (PostgreSQL via Supabase)
└── Encrypted vault data
```

## 🧠 Why Vortex Vault?
> In most password managers, security is a promise. <br> 
> In Vortex Vault, it is a design guarantee.

- No server-side trust required
- All encryption is client-side
- No passwords are saved directly
- Keys change with each session

The project was born from a simple question: <br>
**"What if I create a system that is truly my own, where security is concrete, controllable, and verifiable?"**

## 📌 Status

🚧 Project in active development.

## 📃 License
GNU Affero General Public License

## 🙋‍♂️ Author
Gabbon3 - Gabriele Gherlone
> “I needed a password manager. So I wrote it down.”