# Arkiv Developer Experience & Friction Report

This document records engineering observations, developer friction, and architectural recommendations discovered while building **OrganProtocol** using `@arkiv-network/sdk` (v0.8.x) and the **Arkiv Tiramisu Testnet** (Chain ID: `7738577`).

---

## 1. Highlights: What Worked Well

1. **Viem-Native Architecture**:
   Building `@arkiv-network/sdk` as an extension on top of `viem` (`createPublicClient`, `createWalletClient`) is a stellar design choice. EVM developers do not have to learn a completely foreign client paradigm; familiar concepts like transports (`http()`, `webSocket()`), account abstraction, and block confirmations work out-of-the-box.

2. **Expressive Expiration Primitives (`ExpirationTime`)**:
   The static builders (`ExpirationTime.fromHours(6)`, `ExpirationTime.fromDays(30)`, `ExpirationTime.fromBlocks(100)`) are intuitive and readable. For OrganProtocol, where biological Cold Ischemia Time (CIT) has a direct physical deadline, mapping `fromHours(6)` directly to on-chain TTL without needing manual block height arithmetic saved significant development time.

3. **Type-Safe Attribute Encoding**:
   The typed wrapper functions (`str()`, `i32()`, `u64()`, `bool()`, `addr()`) ensure client-side safety before dispatching mutations to the Tiramisu RPC.

---

## 2. Friction Points & Constructive Recommendations

### Friction 1: Unfiltered Queries Result in Generic Timeout Errors Rather Than Descriptive Precondition Failures
* **Observation**:
  When querying without at least one predicate:
  ```typescript
  // Attempting to inspect all entities created in an app namespace:
  const res = await client.select().fetch();
  ```
  The RPC connection simply stalls and triggers a `TimeoutError: The request took too long to respond` after ~10 seconds.
* **Impact**:
  During initial debugging, developers assume the RPC node is down or inaccessible, when in reality the engine requires indexed filter predicates for safety.
* **Recommendation**:
  The client SDK's `SelectQueryBuilder` should validate locally that `.where()` has been called before dispatching the `arkiv_query` JSON-RPC payload, throwing a clean `MissingQueryPredicateError("Arkiv queries require at least one indexed predicate filter")`.

---

### Friction 2: Lack of Built-in Expiration Countdown / Remaining Block Calculation
* **Observation**:
  `expiresAt` returned on queries or receipts is an absolute block number or timestamp. In applications relying on live TTL (like organ viability countdowns, session timeouts, or expiring offers), developers have to manually query `getBlockNumber()`, estimate average block times (~2 seconds on Tiramisu), and calculate human-readable remaining time.
* **Recommendation**:
  Introduce a helper in `@arkiv-network/sdk/utils`:
  ```typescript
  import { calculateRemainingTime } from '@arkiv-network/sdk/utils';
  const { remainingSeconds, isExpired } = calculateRemainingTime(entity.expiresAt, currentBlockNumber);
  ```

---

### Friction 3: Dual Account Typing in `createWalletClient`
* **Observation**:
  When instantiating `createWalletClient({ chain: tiramisu, transport: http(), account })`, viem requires `account: privateKeyToAccount(...)`. If omitted, mutations like `createEntity` throw a generic runtime error `Account required` during transaction dispatch rather than failing early during client initialization or providing TypeScript compile-time guidance.
* **Recommendation**:
  Export an explicit typed helper:
  ```typescript
  export function createArkivWalletClient<T extends Transport>(
    config: ArkivWalletClientConfig<T>
  ): ArkivWalletClient
  ```
  that marks `account` as mandatory when mutation actions are bound to the client.

---

### Friction 4: Attribute Schema Introspection in Queries
* **Observation**:
  When fetching entities with `.select()`, the payload comes back as raw bytes / strings that require manual `JSON.parse(new TextDecoder().decode(entity.payload))` unless handled via custom transformers.
* **Recommendation**:
  Support an optional automatic payload decoder option in the query builder, e.g.:
  ```typescript
  client.select({ decodeJsonPayload: true }).where(...)
  ```
  which automatically deserializes `contentType: "application/json"` payloads into JavaScript objects.

---

## 3. Summary & Verdict
The Arkiv protocol provides an elegant and long-overdue solution for decentralized expiring state. Solving state bloat and temporal logic at the database layer (rather than writing complex Solidity cron/expiry smart contracts) made building a real-time anti-corruption organ allocation system both viable and rapid.
