# Logging Dashboard Setup Guide

## Option 1: Grafana + Loki (Recommended for Production)

### Installation

1. **Install dependencies:**
```bash
npm install nest-winston winston winston-daily-rotate-file
```

2. **Start the stack:**
```bash
docker-compose up -d
```

3. **Access dashboards:**
- **Grafana Dashboard**: http://localhost:3001
  - Username: `admin`
  - Password: `admin`
- **BullMQ Dashboard**: Add Bull Board separately (see Option 3)

### Using Grafana

1. Login to Grafana (http://localhost:3001)
2. Go to "Explore" in the left menu
3. Select "Loki" datasource
4. Use LogQL queries:

**View all blockchain monitor logs:**
```logql
{job="blockchain-monitor"}
```

**View only errors:**
```logql
{job="blockchain-monitor-errors"}
```

**Search for specific text:**
```logql
{job="blockchain-monitor"} |= "Enqueued block"
```

**Filter by log level:**
```logql
{job="blockchain-monitor"} | json | level="error"
```

**Count blocks enqueued in last hour:**
```logql
sum(count_over_time({job="blockchain-monitor"} |= "Enqueued block" [1h]))
```

4. Create a dashboard:
   - Click "+" → "Dashboard"
   - Add panels with queries
   - Save dashboard

### Creating Alerts

1. Go to Alerting → Alert rules
2. Create new alert:
```logql
count_over_time({job="blockchain-monitor-errors"}[5m]) > 10
```
3. Set notification channel (Slack, email, etc.)

---

## Option 2: Simpler Alternative - Better Stack (Logtail)

If you want a hosted solution without managing infrastructure:

### Setup

1. **Sign up**: https://betterstack.com/logtail (Free tier: 1GB/month)

2. **Install:**
```bash
npm install @logtail/node @logtail/winston
```

3. **Configure Winston:**
```typescript
import { Logtail } from '@logtail/node';
import { LogtailTransport } from '@logtail/winston';

const logtail = new Logtail('YOUR_SOURCE_TOKEN');

// Add to winston transports
new LogtailTransport(logtail)
```

4. **Access**: Web dashboard at https://logs.betterstack.com

**Pros**: No infrastructure, great UI, alerts, SQL queries
**Cons**: Paid after 1GB, data stored externally

---

## Option 3: Bull Board Dashboard (for BullMQ)

Since you already have BullMQ, add Bull Board for queue monitoring:

### Installation

```bash
npm install @bull-board/api @bull-board/nestjs @bull-board/ui
```

### Setup

```typescript
// app.module.ts
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';

@Module({
  imports: [
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: BLOCK_PROCESSING_QUEUE,
      adapter: BullMQAdapter,
    }),
  ],
})
export class AppModule {}
```

**Access**: http://localhost:3000/admin/queues

---

## Option 4: Quick & Simple - PM2 Logs

If you're using PM2 to run your app:

### Setup

1. **Install PM2:**
```bash
npm install -g pm2
pm2 install pm2-logrotate
```

2. **Start app:**
```bash
pm2 start dist/main.js --name blockchain-monitor
```

3. **View logs:**
```bash
# Real-time logs
pm2 logs blockchain-monitor

# Web dashboard
pm2 plus
```

4. **PM2 Plus Dashboard**: https://app.pm2.io (Free tier available)

**Pros**: Dead simple, built-in monitoring
**Cons**: Basic features, no advanced queries

---

## Recommended Setup for Your VPS

**For Small/Medium Scale:**
```
Grafana + Loki (self-hosted) + Bull Board
```
- Full control
- No recurring costs
- Great for 1-10 servers

**For Larger Scale or Less Maintenance:**
```
Better Stack (Logtail) + Bull Board
```
- No infrastructure management
- Better search & filtering
- Automatic alerts

**Quick Start (No Setup):**
```
PM2 Plus
```
- 5-minute setup
- Basic but effective

---

## Full Architecture

```
┌─────────────────┐
│   NestJS App    │
│  (with Winston) │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼───────┐
│ Files │ │  Promtail│
│ /logs │ └──┬───────┘
└───────┘    │
             │
        ┌────▼────┐
        │  Loki   │
        └────┬────┘
             │
        ┌────▼────┐
        │ Grafana │◄── Access: http://localhost:3001
        └─────────┘
```

---

## Quick Commands

```bash
# Start everything
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop everything
docker-compose down

# View Grafana
open http://localhost:3001

# View Bull Board (add to your app)
open http://localhost:3000/admin/queues
```

---

## Grafana Dashboard JSON

Save this as a dashboard in Grafana for instant monitoring:

```json
{
  "panels": [
    {
      "title": "Recent Logs",
      "targets": [
        {
          "expr": "{job=\"blockchain-monitor\"}"
        }
      ]
    },
    {
      "title": "Error Rate",
      "targets": [
        {
          "expr": "sum(rate({job=\"blockchain-monitor\"} | json | level=\"error\" [5m]))"
        }
      ]
    },
    {
      "title": "Blocks Processed",
      "targets": [
        {
          "expr": "count_over_time({job=\"blockchain-monitor\"} |= \"Enqueued block\" [1h])"
        }
      ]
    }
  ]
}
```

---

Choose the option that fits your needs! For production VPS, I recommend **Option 1 (Grafana + Loki)**.