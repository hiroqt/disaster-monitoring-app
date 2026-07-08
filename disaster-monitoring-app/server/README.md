# Disaster Monitoring API Server

Real-time disaster monitoring API that aggregates data from multiple sources including USGS (earthquakes), GDACS (global disasters), and Open-Meteo (weather/floods).

## Features

-  **Real-time data** from 3 external sources
-  **Auto-refresh** every 5 minutes
-  **In-memory caching** for fast responses
-  **Rate limiting** to prevent abuse
-  **Statistics and health monitoring**
- 🇵🇭 **Philippines-focused** (geographic filtering)

## Data Sources

1. **USGS** - United States Geological Survey earthquake data
2. **GDACS** - Global Disaster Alert and Coordination System
3. **Open-Meteo** - Weather and flood risk data

## Quick Start

```bash
# Install dependencies
npm install

# Start the server
node server/index.js

# The server will start on http://localhost:5000
```

## API Endpoints

### GET /api/v1/hazards

Get all hazards with optional filtering.

**Query Parameters:**
- `type` - Filter by hazard type: `earthquake`, `typhoon`, `flood`, `tsunami`, `accident`
- `severity` - Filter by severity: `low`, `medium`, `high`, `critical`
- `since` - ISO 8601 timestamp (e.g., `2026-07-01T00:00:00Z`)
- `limit` - Max results (default: 100, max: 500)
- `offset` - Pagination offset (default: 0)

**Example:**
```bash
GET /api/v1/hazards?type=earthquake&severity=high&limit=10
```

**Response:**
```json
{
  "data": [
    {
      "id": "usgs_us6000t9li",
      "type": "earthquake",
      "timestamp": "2026-07-02T09:30:13.542Z",
      "location": {
        "latitude": 16.4182,
        "longitude": 119.2935
      },
      "status": "confirmed",
      "severity": "medium",
      "metadata": {
        "magnitude": 4.6,
        "depth_km": 22.639,
        "epicenter_name": "56 km WNW of Catuday, Philippines",
        "tsunami_risk": false
      },
      "sources": ["USGS"],
      "description": "Magnitude 4.6 earthquake - 56 km WNW of Catuday, Philippines"
    }
  ],
  "pagination": {
    "total": 5,
    "limit": 100,
    "offset": 0,
    "hasMore": false
  }
}
```

### GET /api/v1/hazards/:id

Get a specific hazard by ID.

**Example:**
```bash
GET /api/v1/hazards/usgs_us6000t9li
```

### GET /api/v1/regions/:regionId/active-hazards

Get active hazards for a specific region (last 48 hours).

**Supported Regions:**
- `ncr` - National Capital Region (Metro Manila)
- `luzon` - Luzon island
- `visayas` - Visayas region
- `mindanao` - Mindanao island

**Example:**
```bash
GET /api/v1/regions/ncr/active-hazards
```

### POST /api/v1/reports

Submit a user report.

**Headers:**
- `x-device-id` - Device identifier (required)

**Body:**
```json
{
  "type": "accident",
  "location": {
    "latitude": 14.5995,
    "longitude": 120.9842
  },
  "description": "Traffic accident on EDSA",
  "photoUrl": "https://example.com/photo.jpg"
}
```

### GET /api/v1/reports

Get user's reports.

**Headers:**
- `x-device-id` - Device identifier (required)

### DELETE /api/v1/reports/:reportId

Delete a user report.

**Headers:**
- `x-device-id` - Device identifier (required)

### GET /api/v1/statistics

Get API statistics.

**Response:**
```json
{
  "data": {
    "last24Hours": {
      "total": 4,
      "byType": {
        "earthquake": 4
      },
      "bySeverity": {
        "medium": 4
      }
    },
    "allTime": {
      "total": 5,
      "userReports": 0
    },
    "sources": {
      "usgs": 2,
      "gdacs": 3,
      "openMeteo": 0
    }
  }
}
```

### GET /api/v1/health

Get system health status.

**Response:**
```json
{
  "status": "operational",
  "services": {
    "usgs": "ok",
    "gdacs": "ok",
    "open_meteo": "ok",
    "phivolcs": "ok",
    "mmda": "degraded"
  },
  "statistics": {
    "totalHazards": 5,
    "userReports": 0,
    "activeUsers": 0
  }
}
```

### POST /api/v1/preferences/notifications

Update notification preferences.

**Headers:**
- `x-device-id` - Device identifier (required)

**Body:**
```json
{
  "topics": ["earthquake_all", "typhoon_all"],
  "regions": ["ncr", "luzon"],
  "severityThreshold": "high"
}
```

### GET /api/v1/preferences/notifications

Get notification preferences.

**Headers:**
- `x-device-id` - Device identifier (required)

## Rate Limits

- **Public reads:** 100 requests/minute per IP
- **Authenticated writes:** 20 requests/minute per user
- **User reports:** 10 submissions/hour per user

## Hazard Types

- `earthquake` - Seismic events
- `typhoon` - Tropical cyclones
- `flood` - Flooding events
- `tsunami` - Tsunami alerts
- `accident` - Traffic accidents and other incidents

## Severity Levels

- `low` - Minor impact
- `medium` - Moderate impact
- `high` - Significant impact
- `critical` - Severe impact requiring immediate action

## Status Types

- `confirmed` - Verified by official source
- `unconfirmed` - User report not yet verified
- `multi_source_confirmed` - Confirmed by multiple sources

## Testing

Run the test script to verify API integrations:

```bash
node server/test-api.js
```

## Cache Behavior

- Data refreshes automatically every 5 minutes
- Cache information included in response metadata
- HTTP cache headers set appropriately (30-60 seconds)

## Error Handling

All errors return a consistent format:

```json
{
  "error": "Error type",
  "message": "Detailed error message"
}
```

## Environment Variables

```env
PORT=5000  # Server port (default: 5000)
NODE_ENV=development  # Environment mode
```

## Architecture

```
┌─────────────────────────────────────────┐
│         Express API Server              │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────────────────────────┐    │
│  │   Data Aggregator Service      │    │
│  │  (In-memory cache, 5min TTL)   │    │
│  └────────────────────────────────┘    │
│              │                          │
│    ┌─────────┼──────────┐              │
│    │         │          │               │
│  ┌─▼──┐  ┌──▼──┐  ┌───▼────┐          │
│  │USGS│  │GDACS│  │Weather │          │
│  └────┘  └─────┘  └────────┘          │
└─────────────────────────────────────────┘
```

## Next Steps

1. Add PostgreSQL for persistent storage
2. Implement Redis for distributed caching
3. Add WebSocket support for real-time updates
4. Implement Firebase Cloud Messaging (FCM) for push notifications
5. Add authentication with JWT tokens
6. Implement admin endpoints with proper authorization
