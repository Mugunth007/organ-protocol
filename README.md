# 🫀 OrganProtocol
### Decentralized Cadaveric Organ Allocation & Cold-Ischemia Decay Protocol built on Arkiv

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](./LICENSE)
[![Arkiv Tiramisu](https://img.shields.io/badge/Network-Arkiv%20Tiramisu%20(7738577)-amber.svg)](https://tiramisu.explorer.arkiv.network)
[![Track](https://img.shields.io/badge/Track-Best%20Indian%20Use%20Case%20%7C%20CROPS-rose.svg)](#)

---

## 📌 Executive Summary & The Indian Healthcare Crisis
In India, cadaveric (deceased donor) organ transplantation is crippled by two fatal systemic bottlenecks:

1. **VIP Queue-Jumping & Black-Market Bribery**:
   Centralized state hospital registries (NOTTO / ROTTO) run on private databases vulnerable to internal manipulation. Wealthy individuals and medical tourists regularly pay bribes to hospital coordinators in Delhi and Mumbai to alter waitlist timestamps, pushing poor and critically dying patients down the queue.
2. **Organ Wastage Due to Cold Ischemia Time (CIT)**:
   Once harvested from a brain-dead donor, human organs have a biological viability window before irreversible cellular necrosis occurs outside the body:
   * **Heart**: **4 to 6 hours**
   * **Liver**: **8 to 12 hours**
   * **Kidney**: **24 to 36 hours**

Because bureaucratic coordination is fragmented and slow, hundreds of harvested organs in India expire in transit and are incinerated.

---

## ⚡ The Arkiv Breakthrough: Biological Cold-Ischemia Time as Native TTL
Conventional blockchains cannot solve this efficiently because storing temporal data requires bloated smart contracts, periodic cron triggers, or costly upkeep bots.

**OrganProtocol maps human biology directly to Arkiv's core innovation — native programmable Time-To-Live (TTL)**:
* **Autonomous Block-Decay Expiration**: When a donor hospital harvests a heart, the verified hospital node mints an `OrganHarvestEntity` on Arkiv with an exact **6-hour TTL (`ExpirationTime.fromHours(6)`)**.
* **Zero Retroactive Tampering**: If an organ is not claimed and allocated within its viability window, Arkiv’s storage engine naturally expires the entity from the active emergency pool. No hospital administrator can alter the harvest timestamp to sell an expired or redirected organ.
* **Cryptographic Waitlist Integrity**: Anonymized recipient priority entities (`RecipientWaitlistEntity`) are ordered mathematically by clinical severity (MELD/CPRA scores) and block registration height. Queue order is immutable and censorship-resistant.
* **DPDP Act Compliant**: In accordance with India’s Digital Personal Data Protection Act and hackathon rules, **zero PII** (no names, phone numbers, or Aadhaar numbers) is stored on-chain in plaintext or hash form.

---

## 🏆 Hackathon Gate Checklist
- [x] **Public MIT Repo**: [LICENSE](./LICENSE)
- [x] **Entity Schema Specification**: [`/arkiv/schema.md`](./arkiv/schema.md)
- [x] **Developer Friction Report**: [`/arkiv/friction.md`](./arkiv/friction.md)
- [x] **Arkiv Entity Signer Wallet Address**: `0x312d820b86Ab738f62cbEF5bcBb1DAC72660E617`
- [x] **Network**: Arkiv Tiramisu Testnet (`Chain ID: 7738577`)
- [x] **Built between 9 and 18 October 2026** for the Road to Devcon 8 Mumbai Hackathon.

---

## 🛠️ Tech Stack & SDK Integration
* **Database & Consensus**: Arkiv Tiramisu Testnet (`@arkiv-network/sdk` v0.8.1)
* **Web3 Transport**: `viem` v2.57.x
* **Frontend**: Next.js 14 (App Router), Tailwind CSS, Lucide Icons
* **Federated Hospital Nodes**: AIIMS New Delhi, KEM Hospital Mumbai, Apollo Chennai, NIMHANS Bengaluru

---

## 🚀 Quickstart & Reproducible Steps

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/organ-protocol.git
cd organ-protocol
npm install
```

### 2. Environment Configuration
Create a `.env.local` file (or use the included `.env.example`):
```env
NEXT_PUBLIC_ARKIV_RPC_URL=https://rpc.tiramisu.db-chain.testnet.arkiv.network
NEXT_PUBLIC_ARKIV_CHAIN_ID=7738577
ARKIV_OPERATOR_PRIVATE_KEY=0xbd3f0a23150cf35405fc901bc01b028a7db4ae5c7754cf5eb6f21672e1934c1c
NEXT_PUBLIC_OPERATOR_ADDRESS=0x312d820b86Ab738f62cbEF5bcBb1DAC72660E617
```

### 3. Faucet Gas
To execute on-chain mutations directly on Tiramisu:
1. Open the Arkiv Hub: [https://hub.arkiv.network](https://hub.arkiv.network)
2. Request testnet tokens for the operator address: `0x312d820b86Ab738f62cbEF5bcBb1DAC72660E617`

### 4. Run On-Chain Entity Seeding
Seed real cadaveric organ donations and recipient waitlist entities onto the Arkiv Tiramisu blockchain:
```bash
npm run seed
```

### 5. Launch Local Dev Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live dashboard.

---

## 🔬 Arkiv Schema Highlights

### Organ Entity Minting with Native Biological TTL
```typescript
import { createWalletClient, str, i32, jsonToPayload, ExpirationTime } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { http } from 'viem';

const res = await walletClient.createEntity({
  payload: jsonToPayload({
    donorRef: "ANON-DONOR-8821-DELHI",
    hlaCompatibility: { hla_A: "02:01/24:02", hla_B: "35:01/44:03" },
    perfusionSolution: "University_of_Wisconsin_Cold_Perfusion",
    targetTemperatureCelsius: 4.0
  }),
  contentType: "application/json",
  attributes: {
    app: str("organprotocol"),
    entity_type: str("ORGAN_HARVEST"),
    organ_type: str("HEART"),
    blood_group: str("O_POS"),
    status: str("HARVESTED"),
    donor_hospital: str("AIIMS_DELHI"),
    city: str("Delhi"),
    ischemia_hours: i32(6),
    urgency_tier: str("TIER_1_CRITICAL")
  },
  // Arkiv TTL enforces biological Cold-Ischemia Time
  expires: ExpirationTime.fromHours(6) 
});
```

---

## ⚖️ Indian Healthcare Regulatory Compliance
OrganProtocol is specifically engineered to respect the statutory requirements of:
1. **Transplantation of Human Organs and Tissues Act (THOTA), 1994 & 2014 Rules**:
   Retains accredited hospital medical oversight while replacing error-prone centralized state waitlists with decentralized consensus.
2. **Digital Personal Data Protection Act (DPDP), 2023**:
   No patient identifiable information (Aadhaar number, phone number, name, residential address) is written into payloads or attributes. Verification relies exclusively on blinded clinical compatibility indices (MELD/CPRA scores and HLA crossmatches).

---

## 👥 Authors & Acknowledgments
Built with ❤️ for Devcon 8 Mumbai & the Arkiv ecosystem.
* Track: **Best Indian Use Case** & **CROPS Track**
* License: **MIT**
