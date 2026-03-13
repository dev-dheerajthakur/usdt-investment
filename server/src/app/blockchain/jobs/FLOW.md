┌─────────────────────────────────────────────────────────────────────┐
│                         STARTUP PHASE                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   monitor.start()         │
                    └─────────────┬─────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            │                     │                     │
            ▼                     ▼                     ▼
    ┌───────────────┐   ┌─────────────────┐   ┌──────────────────┐
    │ Verify RPC    │   │ Load Last       │   │ Cache User       │
    │ Connection    │   │ Processed Block │   │ Addresses        │
    │ (Polygon?)    │   │ from DB         │   │ from DB          │
    └───────────────┘   └─────────────────┘   └──────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Start Two Listeners:    │
                    │   1. Real-time (WebSocket)│
                    │   2. Backup Polling (30s) │
                    └─────────────┬─────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                      MONITORING PHASE                                │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            ┌───────▼────────┐         ┌────────▼────────┐
            │  LISTENER 1:   │         │  LISTENER 2:    │
            │  Real-time     │         │  Backup Polling │
            │  Block Events  │         │  (every 30s)    │
            └───────┬────────┘         └────────┬────────┘
                    │                           │
                    │    New Block Detected     │
                    │    (e.g., #68877971)      │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │   Is Already Processing?  │
                    │   (isProcessing flag)     │
                    └─────────────┬─────────────┘
                                  │
                        No ───────┼────── Yes → Skip Block
                                  │
                    ┌─────────────▼─────────────┐
                    │   processBlock(#68877971) │
                    │   Set isProcessing = true │
                    └─────────────┬─────────────┘
                                  │
┌─────────────────────────────────────────────────────────────────────┐
│                    BLOCK PROCESSING PHASE                            │
└─────────────────────────────────────────────────────────────────────┘
                                  │
                    ┌─────────────▼─────────────┐
                    │ Get Cached User Addresses │
                    │ [0x123..., 0x456..., ...] │
                    └─────────────┬─────────────┘
                                  │
                    ┌─────────────┴─────────────┐
                    │                           │
            ┌───────▼────────┐         ┌────────▼────────┐
            │ USDT TRANSFERS │         │  POL TRANSFERS  │
            └───────┬────────┘         └────────┬────────┘
                    │                           │
                    │                           │
┌───────────────────▼──────────────┐  ┌─────────▼───────────────────┐
│  getUSDTTransactions()           │  │  getPOLTransactions()       │
│                                  │  │                             │
│  1. Create filter:               │  │  1. Get block with txs:     │
│     usdtContract.filters         │  │     provider.getBlock()     │
│     .Transfer()                  │  │                             │
│                                  │  │  2. Filter transactions:    │
│  2. Query blockchain:            │  │     - data === "0x"         │
│     queryFilter(filter,          │  │     - value > 0             │
│                 block, block)    │  │     - involves user address │
│                                  │  │                             │
│  3. Filter results:              │  │  3. Return POL transfers    │
│     - to/from in user addresses  │  │                             │
│                                  │  │                             │
│  4. Return USDT events           │  │                             │
└───────────────────┬──────────────┘  └─────────┬───────────────────┘
                    │                           │
                    │  Events Found?            │  Transactions Found?
                    │  (e.g., 3 USDT transfers) │  (e.g., 2 POL transfers)
                    │                           │
                    ▼                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    TRANSACTION HANDLING                              │
└─────────────────────────────────────────────────────────────────────┘
                    │                           │
      ┌─────────────┴──────────┐    ┌──────────┴─────────────┐
      │                        │    │                        │
      ▼                        ▼    ▼                        ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ handleUSDT      │   │ handleUSDT      │   │ handlePOL       │
│ Transaction #1  │   │ Transaction #2  │   │ Transaction #1  │
└────────┬────────┘   └────────┬────────┘   └────────┬────────┘
         │                     │                     │
         └─────────────────────┴─────────────────────┘
                               │
         ┌─────────────────────▼─────────────────────┐
         │   TRANSACTION PROCESSING STEPS             │
         │                                            │
         │   1. Parse transaction data:               │
         │      - to, from, value, txHash             │
         │      - amount = formatUnits(value, 6/18)   │
         │                                            │
         │   2. Find user by deposit address:         │
         │      SELECT * FROM users                   │
         │      WHERE deposit_address = 'to'          │
         │                                            │
         │   3. Check duplicate (txHash):             │
         │      SELECT * FROM transactions            │
         │      WHERE tx_hash = 'hash'                │
         │      → If exists: Skip                     │
         │                                            │
         │   4. Start DB Transaction                  │
         │      BEGIN;                                │
         │                                            │
         │   5. Insert transaction record:            │
         │      INSERT INTO transactions              │
         │      (user_id, tx_hash, amount, ...)       │
         │                                            │
         │   6. Update user investment:               │
         │      - If exists: UPDATE principal         │
         │      - If new: INSERT investment           │
         │                                            │
         │   7. COMMIT;                               │
         │                                            │
         │   8. Post-processing (async):              │
         │      - Queue consolidation job             │
         │      - Send user notification              │
         └────────────────────────────────────────────┘
                               │
         ┌─────────────────────▼─────────────────────┐
         │   Update Last Processed Block              │
         │   db.setLastProcessedBlock(#68877971)     │
         │   Set isProcessing = false                 │
         └────────────────────────────────────────────┘
                               │
                               ▼
                    ┌──────────────────┐
                    │  Wait for Next   │
                    │  Block...        │
                    └──────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                    BACKUP & ERROR HANDLING                           │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│ Every 30 seconds:    │         │ If Processing Fails: │
│                      │         │                      │
│ catchUpMissedBlocks()│         │ retryProcessBlock()  │
│                      │         │                      │
│ 1. Get current block │         │ 1. Exponential       │
│ 2. Calculate gap     │         │    backoff delay     │
│ 3. Process up to     │         │ 2. Retry up to 3x    │
│    100 missed blocks │         │ 3. Log failed block  │
└──────────────────────┘         └──────────────────────┘

┌──────────────────────┐         ┌──────────────────────┐
│ Connection Lost:     │         │ Graceful Shutdown:   │
│                      │         │                      │
│ reconnect()          │         │ stop()               │
│                      │         │                      │
│ 1. Remove listeners  │         │ 1. Clear polling     │
│ 2. Create new        │         │ 2. Remove listeners  │
│    provider          │         │ 3. Exit              │
│ 3. Restart listeners │         │                      │
└──────────────────────┘         └──────────────────────┘


Key Flow Points:
🔵 Parallel Processing:

USDT uses contract events (queryFilter)
POL uses transaction parsing (getBlock)

🔵 Efficiency:

Cached user addresses (60s TTL)
Filter at blockchain level first
Then check against user set

🔵 Reliability:

Duplicate detection (txHash check)
Database transactions (atomic)
Retry logic (3 attempts)
Backup polling (catch missed blocks)

🔵 Concurrency:

isProcessing flag prevents overlap
Sequential block processing
