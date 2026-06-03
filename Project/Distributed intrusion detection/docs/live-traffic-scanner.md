# Live Traffic Scanner

## Overview

The Live Traffic Scanner is an isolated module that records real incoming request metadata without changing existing routes or business logic.

Frontend route:

```text
/live-traffic
```

Backend routes:

```http
GET /api/live-traffic
GET /api/live-traffic/logs
GET /api/live-traffic/stats
GET /api/live-traffic/export?format=csv
GET /api/live-traffic/export?format=json
GET /api/live-traffic/stream
```

## What It Captures

For each request, the scanner stores:

- Client IP address
- Timestamp
- Request method
- URL/path
- User agent
- Referrer
- Country, when available
- Response status code

## Real IP Extraction

The scanner resolves real client IPs from:

1. `X-Forwarded-For`
2. `X-Real-IP`
3. Express `req.ip`
4. Socket/remote address fallback

The API server enables `trust proxy`, so reverse proxy deployments can preserve real client IPs.

## Database Setup

The new table is defined in:

```text
lib/db/src/schema/liveTraffic.ts
```

Apply it with Drizzle:

```bash
DATABASE_URL=postgresql://user:password@host:5432/dids pnpm --filter @workspace/db run push
```

The table includes indexes for:

- IP address
- Path
- Status code
- Timestamp

## Real-Time Updates

Real-time updates use Server-Sent Events:

```http
GET /api/live-traffic/stream
```

Native browser `EventSource` cannot set Authorization headers, so the frontend passes the current JWT as a query token for this SSE endpoint only. Normal list, stats, and export requests continue using Bearer headers.

## Filtering

The logs and stats endpoints support:

- `ip`
- `endpoint`
- `statusCode`
- `from`
- `to`
- `limit`

Example:

```http
GET /api/live-traffic/logs?ip=192.168&endpoint=/api&statusCode=200
```

## Export

CSV:

```http
GET /api/live-traffic/export?format=csv
```

JSON:

```http
GET /api/live-traffic/export?format=json
```

## Production Notes

- `DIDS_LIVE_TRAFFIC_MAX_LOGS_PER_IP_PER_MINUTE` protects the database from excessive log writes by a single IP.
- Export endpoints have an additional in-memory rate limit.
- For multi-instance deployments, move active visitor tracking and rate counters to Redis.
- For country lookup, add a GeoIP provider or local MaxMind database and replace the current private/local/unknown fallback.
- For high-traffic deployments, consider async queueing for log writes.
