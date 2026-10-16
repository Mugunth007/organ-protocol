# OrganProtocol — Arkiv Entity Schema Specification

## 1. Overview & Architectural Motivation
In cadaveric organ transplantation across India, two critical systemic failures cause preventable loss of life:
1. **Administrative waitlist corruption & queue-jumping** (tampering with centralized state databases to prioritize VIP/wealthy recipients over critically dying patients).
2. **Organ wastage due to Cold Ischemia Time (CIT)**: harvested human organs deteriorate rapidly once blood circulation stops (Heart: 4–6h, Liver: 8–12h, Kidney: 24–36h). Due to bureaucratic friction and delayed notification, organs frequently spoil and must be incinerated.

**OrganProtocol** addresses this by binding cadaveric organ availability directly to **Arkiv's native Time-To-Live (TTL)**. Once harvested, an organ entity exists on-chain with a hard biological expiration block. If not claimed and dispatched within this viability window, the entity naturally expires from the emergency pool, preventing retroactive timestamp forgery or black-market reallocation.

---

## 2. Arkiv Network Configuration
* **Network**: Arkiv Tiramisu Testnet
* **Chain ID**: `7738577`
* **RPC Endpoint**: `https://rpc.tiramisu.db-chain.testnet.arkiv.network`
* **SDK Version**: `@arkiv-network/sdk` v0.8.x + `viem` v2.57.x

---

## 3. Entity Definitions

### 3.1. `OrganHarvestEntity`
Represents an available donor organ harvested at an accredited hospital node.

| Attribute Name | Arkiv Type | Query Indexed | Description |
| :--- | :--- | :--- | :--- |
| `app` | `str` | Yes | Constant tag: `"organprotocol"` |
| `entity_type` | `str` | Yes | Constant tag: `"ORGAN_HARVEST"` |
| `organ_type` | `str` | Yes | `"HEART"`, `"LIVER"`, `"KIDNEY"`, `"LUNG"` |
| `blood_group` | `str` | Yes | `"O_POS"`, `"A_POS"`, `"B_POS"`, `"AB_POS"`, `"O_NEG"`, etc. |
| `status` | `str` | Yes | `"HARVESTED"`, `"DISPATCHED"`, `"TRANSPLANTED"`, `"EXPIRED"` |
| `donor_hospital` | `str` | Yes | Hospital node identifier (e.g. `"AIIMS_DELHI"`, `"KEM_MUMBAI"`, `"APOLLO_CHENNAI"`) |
| `city` | `str` | Yes | Metro dispatch node (e.g. `"Delhi"`, `"Mumbai"`, `"Chennai"`, `"Bengaluru"`) |
| `ischemia_hours` | `i32` | Yes | Biological maximum viability hours (`6` for Heart, `12` for Liver, `36` for Kidney) |
| `urgency_tier` | `str` | Yes | Clinical priority ceiling (`"TIER_1_CRITICAL"`, `"TIER_2_HIGH"`) |

#### Expiration Mapping (Arkiv TTL):
```typescript
// Biological Cold-Ischemia Time enforces on-chain expiration:
expires: ExpirationTime.fromHours(ischemiaHours) 
// Demo/fast-testing: ExpirationTime.fromMinutes(15)
```

#### Payload (JSON):
```json
{
  "donorRef": "ANON-DONOR-8841-DL",
  "harvestTimestamp": 1729074000,
  "surgeonVerificationHash": "0x4b7f9208a6...4192",
  "hlaCompatibility": {
    "hla_A": "02:01/24:02",
    "hla_B": "35:01/44:03",
    "hla_DR": "04:01/11:01"
  },
  "perfusionSolution": "UW_Cold_Storage",
  "targetTemperatureCelsius": 4.0
}
```

---

### 3.2. `RecipientWaitlistEntity`
Represents an anonymized patient awaiting transplantation in an accredited Indian hospital.

> **Privacy & DPDP Compliance Note**: In strict adherence to India's Digital Personal Data Protection Act (DPDP) and hackathon submission rules, **zero Personally Identifiable Information (PII)** (no names, Aadhaar numbers, phone numbers, or addresses) is stored on-chain, either in plaintext or hashed form. Patients are represented solely by verifiable cryptographic public keys and synthetic clinical compatibility scores.

| Attribute Name | Arkiv Type | Query Indexed | Description |
| :--- | :--- | :--- | :--- |
| `app` | `str` | Yes | Constant tag: `"organprotocol"` |
| `entity_type` | `str` | Yes | Constant tag: `"RECIPIENT_WAITLIST"` |
| `organ_type` | `str` | Yes | Target organ (`"HEART"`, `"LIVER"`, `"KIDNEY"`) |
| `blood_group` | `str` | Yes | Compatible recipient blood group |
| `priority_score` | `i32` | Yes | Clinical urgency score (e.g. MELD score 6–40 for liver, CPRA score for kidney) |
| `hospital_node` | `str` | Yes | Managing medical center (`"KEM_MUMBAI"`, `"AIIMS_DELHI"`) |
| `status` | `str` | Yes | `"WAITING"`, `"ALLOCATED"`, `"TRANSPLANTED"` |
| `waitlist_block` | `u64` | Yes | On-chain registration block for deterministic FIFO sequencing |

#### Payload (JSON):
```json
{
  "recipientRef": "ANON-REC-1092-MH",
  "meldScore": 34,
  "dialysisMonths": 42,
  "crossmatchNegative": true,
  "treatingPhysicianBadge": "MCI-REG-847291"
}
```

---

### 3.3. `TransitChainEntity`
Represents the green-corridor chain-of-custody tracking the physical organ transport between donor and recipient hospitals.

| Attribute Name | Arkiv Type | Query Indexed | Description |
| :--- | :--- | :--- | :--- |
| `app` | `str` | Yes | Constant tag: `"organprotocol"` |
| `entity_type` | `str` | Yes | Constant tag: `"TRANSIT_CORRIDOR"` |
| `organ_entity_key` | `str` | Yes | Arkiv entity key of the associated `OrganHarvestEntity` |
| `corridor_status` | `str` | Yes | `"IN_TRANSIT"`, `"ARRIVED_THEATER"`, `"SURGERY_INITIATED"` |
| `corridor_route` | `str` | Yes | E.g. `"AIIMS_DELHI_TO_FORTIS_OKHLA"` |

---

## 4. Query Patterns

### 4.1. Real-Time Emergency Matching Query
Querying viable donor organs that have not decayed and are currently available:
```typescript
import { createPublicClient } from '@arkiv-network/sdk';
import { tiramisu } from '@arkiv-network/sdk/chains';
import { and, eq } from '@arkiv-network/sdk/query';
import { http } from 'viem';

const client = createPublicClient({ chain: tiramisu, transport: http() });

const viableOrgans = await client
  .select()
  .where(
    and(
      eq('app', 'organprotocol'),
      eq('entity_type', 'ORGAN_HARVEST'),
      eq('organ_type', 'HEART'),
      eq('blood_group', 'O_POS'),
      eq('status', 'HARVESTED')
    )
  )
  .fetch();
```

### 4.2. Immutable Priority Waitlist Query
Retrieves the uncorrupted recipient queue ordered by registered block and clinical priority score:
```typescript
const waitlist = await client
  .select()
  .where(
    and(
      eq('app', 'organprotocol'),
      eq('entity_type', 'RECIPIENT_WAITLIST'),
      eq('organ_type', 'HEART'),
      eq('status', 'WAITING')
    )
  )
  .fetch();
```

---

## 5. Mutation Operations

### 5.1. Harvesting & Minting with Cold-Ischemia TTL
```typescript
const { entityKey, txHash, expiresAt } = await walletClient.createEntity({
  payload: jsonToPayload(donorMetadata),
  contentType: 'application/json',
  attributes: {
    app: str('organprotocol'),
    entity_type: str('ORGAN_HARVEST'),
    organ_type: str('HEART'),
    blood_group: str('O_POS'),
    status: str('HARVESTED'),
    donor_hospital: str('AIIMS_DELHI'),
    city: str('Delhi'),
    ischemia_hours: i32(6),
    urgency_tier: str('TIER_1_CRITICAL'),
  },
  expires: ExpirationTime.fromHours(6),
});
```

### 5.2. Dispatching & Transitioning Status
```typescript
await walletClient.patchEntity({
  entityKey: targetOrganKey,
  set: {
    status: str('DISPATCHED'),
  },
});
```
