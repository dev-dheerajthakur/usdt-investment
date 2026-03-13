-- Atomic check-and-deduct in Redis
local balance = tonumber(redis.call('GET', 'balance:' .. userId))
if balance >= amount then
    redis.call('DECRBY', 'balance:' .. userId, amount)
    return 1  -- accepted
else
    return 0  -- rejected
end
```

This runs in **microseconds**, can handle **100k+ ops/sec** on a single Redis node, and is atomic so no double-spend.

### Step 3 — Push accepted requests to a message queue (Kafka/RabbitMQ/SQS)
```
Queue: investment_requests
→ { userId, amount, timestamp, requestId }
```

Return `202 Accepted` to the user immediately with a `requestId`.

### Step 4 — Workers consume the queue and write to DB

Workers at their own pace:
1. Deduct balance in DB (matching what Redis already reserved)
2. Create investment record
3. Send final confirmation notification to user

---

## What the User Experiences
```
9:00:00 AM  →  User hits /create-investment
9:00:00 AM  →  Redis atomically checks & reserves balance
9:00:00 AM  →  User gets: "Investment queued! ID: #abc123"
9:00:03 AM  →  Worker processes it, DB updated
9:00:03 AM  →  User gets push notification: "Investment confirmed ✓"
```

Users with 0 balance get **instant rejection** at the Redis layer — no false hope.

---

## Architecture Diagram
```
Client
  │
  ▼
API Gateway / Load Balancer
  │
  ▼
Investment Service (stateless, scale horizontally)
  │
  ├─► Redis (atomic balance check + reserve)  ◄── pre-loaded at 8:55 AM
  │       │
  │    accepted?
  │       │
  ├─► Message Queue (Kafka/SQS)
  │
  ▼
Workers (consume queue)
  │
  ├─► DB (write investment + deduct balance)
  └─► Notification Service