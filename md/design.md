# Design Document
## Philippines Disaster Monitoring Application

## 1. System Architecture Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     FLUTTER MOBILE APP                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │ Presentation │  │   BLoC      │  │  Local Cache     │   │
│  │   Layer      │◄─┤   Layer     │◄─┤  (Hive/Isar)     │   │
│  └─────────────┘  └─────────────┘  └──────────────────┘   │
│         │              │                     │               │
│         │              ├─────────────────────┤               │
│         │              │  Repository Layer   │               │
│         │              └─────────────────────┘               │
└─────────┼──────────────────────┬──────────────────────────┘
          │                      │
          │ FCM Push             │ HTTPS REST API
          │                      │
┌─────────▼──────────────────────▼──────────────────────────┐
│                      BACKEND SERVICES                       │
│  ┌──────────────────┐        ┌──────────────────────────┐ │
│  │   API Gateway    │        │   Ingestion Service      │ │
│  │  (Load Balanced) │        │     (Isolated)           │ │
│  └────────┬─────────┘        └───────────┬──────────────┘ │
│           │                               │                 │
│           │    ┌─────────────────────┐   │                 │
│           ├────┤  Alert Engine +     │◄──┤                 │
│           │    │  FCM Integration    │   │                 │
│           │    └─────────────────────┘   │                 │
│           │                               │                 │
│  ┌────────▼─────────┐          ┌─────────▼──────────┐     │
│  │   PostgreSQL     │          │  Redis Cache       │     │
│  │   + PostGIS      │          │  + Message Queue   │     │
│  └──────────────────┘          └────────────────────┘     │
└────────────────────────────────────────────────────────────┘
                         │
                         │ Scheduled Polling
                         │
┌────────────────────────▼────────────────────────────────────┐
│                   EXTERNAL DATA SOURCES                      │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────────┐  │
│  │   USGS   │ │  GDACS   │ │Open-Meteo │ │  PHIVOLCS   │  │
│  │Earthquake│ │Multi-    │ │ Weather   │ │ Earthquake  │  │
│  └──────────┘ └──────────┘ └───────────┘ └─────────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌───────────┐                  │
│  │  PAGASA  │ │   MMDA   │ │  TomTom   │                  │
│  │ Weather  │ │  Traffic │ │  Traffic  │                  │
│  └──────────┘ └──────────┘ └───────────┘                  │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Component Responsibilities

#### Flutter Mobile App (Disaster_Monitoring_App)
- **Presentation Layer**: UI rendering with flutter_map for geographic visualization
- **BLoC Layer**: State management for hazards, map, user preferences, authentication
- **Repository Layer**: Data fetching, caching coordination, offline-first logic
- **Local Cache**: Hive/Isar database for offline access to hazard data
- **Geofencing**: Background location monitoring for automatic alerts

#### Backend Services
- **API Gateway**: Rate limiting, authentication, request routing
- **Ingestion Service**: Scraping, polling, data validation from external sources
- **Alert Engine**: Push notification triggering via FCM, topic subscriptions
- **Normalizer**: Transform heterogeneous data into unified Hazard_Record model
- **PostgreSQL + PostGIS**: Persistent storage with spatial queries
- **Redis**: Caching layer and message queue for scraper buffering

---

## 2. Data Model

### 2.1 Core Entity: Hazard_Record

```dart
class HazardRecord {
  String id;                    // UUID
  HazardType type;              // earthquake | typhoon | flood | tsunami | accident
  DateTime timestamp;           // Event occurrence time (ISO 8601 UTC)
  GeoPoint location;            // Latitude, longitude
  ConfirmationStatus status;    // confirmed | unconfirmed | multi_source_confirmed
  Severity severity;            // low | medium | high | critical
  Map<String, dynamic> metadata; // Type-specific fields
  List<String> sources;         // e.g., ["USGS", "PHIVOLCS"]
  String? description;
  DateTime createdAt;
  DateTime updatedAt;
}

enum HazardType { earthquake, typhoon, flood, tsunami, accident }
enum ConfirmationStatus { confirmed, unconfirmed, multiSourceConfirmed }
enum Severity { low, medium, high, critical }

class GeoPoint {
  double latitude;
  double longitude;
}
```

### 2.2 Type-Specific Metadata Schemas

#### Earthquake Metadata
```dart
{
  "magnitude": 6.2,           // float, range 0.1-10.0
  "depth_km": 15.3,           // float
  "epicenter_name": "30km NE of Manila",
  "tsunami_risk": false       // bool
}
```

#### Typhoon Metadata
```dart
{
  "wind_speed_kph": 150,      // float
  "central_pressure_hpa": 960,
  "forecast_track": [         // Array of projected positions
    {"lat": 14.5, "lon": 121.0, "timestamp": "2026-06-30T12:00:00Z"},
    {"lat": 14.8, "lon": 121.3, "timestamp": "2026-06-30T18:00:00Z"}
  ],
  "affected_regions": ["Metro Manila", "Quezon Province"]
}
```

#### Flood Metadata
```dart
{
  "hazard_level": "very_high",  // low | medium | high | very_high
  "rainfall_intensity_mm": 35.2,
  "affected_municipalities": ["Marikina", "Pasig"]
}
```

#### Tsunami Metadata
```dart
{
  "wave_height_m": 3.5,
  "estimated_arrival": "2026-06-30T14:30:00Z",
  "affected_coastlines": ["Batangas", "Quezon"]
}
```

#### Accident Metadata
```dart
{
  "incident_type": "road_accident",  // road_accident | traffic_jam | road_closure
  "severity": "major",
  "photo_url": "https://cdn.example.com/photos/accident_123.jpg",
  "verified": false,
  "reporter_id": "device_xyz"
}
```

### 2.3 User_Report Entity

```dart
class UserReport {
  String id;
  String reporterId;        // Device ID or authenticated user ID
  HazardType type;
  GeoPoint location;
  String? photoUrl;
  String? description;
  ModerationStatus status;  // pending | approved | rejected | spam
  DateTime submittedAt;
}

enum ModerationStatus { pending, approved, rejected, spam }
```

### 2.4 Configuration Entity

```dart
class AppConfiguration {
  DatabaseConfig database;
  Map<String, ApiSourceConfig> dataSources;
  FcmConfig fcm;
  RateLimitConfig rateLimits;
  CacheConfig cache;
  FeatureFlags features;
}

class ApiSourceConfig {
  String baseUrl;
  String? apiKey;
  int pollIntervalSeconds;
  int maxRetries;
  int timeoutSeconds;
}
```

---

## 3. Backend Services Design

### 3.1 Ingestion Service Architecture

**Technology Stack:**
- Language: Python 3.11+ or Node.js 20+
- HTTP Client: `aiohttp` (Python) or `axios` (Node.js)
- Message Queue: Redis Pub/Sub or RabbitMQ
- Scheduler: APScheduler or node-cron

**Scraping Workers:**
```
┌──────────────────────────────────────────────────┐
│            Ingestion Service Process              │
│                                                   │
│  ┌────────────────┐  ┌────────────────┐         │
│  │ USGS Scraper   │  │ GDACS Scraper  │         │
│  │ (WebSocket)    │  │ (GeoRSS Poll)  │         │
│  └───────┬────────┘  └────────┬───────┘         │
│          │                    │                  │
│  ┌───────▼────────┐  ┌────────▼───────┐         │
│  │ Open-Meteo     │  │ PHIVOLCS       │         │
│  │ (REST Poll)    │  │ (HTML Scrape)  │         │
│  └───────┬────────┘  └────────┬───────┘         │
│          │                    │                  │
│          └────────┬───────────┘                  │
│                   │                              │
│           ┌───────▼─────────┐                    │
│           │   Normalizer    │                    │
│           │  (Validation)   │                    │
│           └───────┬─────────┘                    │
│                   │                              │
│           ┌───────▼─────────┐                    │
│           │ Redis Queue     │                    │
│           │ (Buffer)        │                    │
│           └───────┬─────────┘                    │
│                   │                              │
│           ┌───────▼─────────┐                    │
│           │ Database Writer │                    │
│           │ (Batch Insert)  │                    │
│           └─────────────────┘                    │
└──────────────────────────────────────────────────┘
```

**Polling Schedule:**
- USGS: WebSocket connection (real-time)
- GDACS: Every 5 minutes
- Open-Meteo: Every 15 minutes
- PHIVOLCS: Every 10 minutes (HTML scrape)
- MMDA/TomTom Traffic: Every 10 minutes

**Validation Rules:**
```python
def validate_earthquake_record(data):
    assert 0.1 <= data['magnitude'] <= 10.0
    assert is_within_philippine_bounds(data['latitude'], data['longitude'])
    assert not is_future_timestamp(data['timestamp'])
    assert timestamp_age_hours(data['timestamp']) <= 48
    return True

def is_within_philippine_bounds(lat, lon):
    return 4.0 <= lat <= 21.0 and 116.0 <= lon <= 127.0
```

### 3.2 Alert Engine Design

**Push Notification Flow:**
```
Hazard_Record → Validation → Subscription Matching → FCM Topic Send → Audit Log
```

**Topic-Based Subscriptions:**
- `/topics/earthquake_all`
- `/topics/earthquake_region_ncr`
- `/topics/typhoon_all`
- `/topics/tsunami_coastal`
- `/topics/flood_metro_manila`

**Alert Prioritization:**
1. **Critical (Immediate)**: Tsunami, Magnitude ≥7.0 earthquakes
2. **High (Within 30s)**: Typhoons, Magnitude 5.0-6.9 earthquakes
3. **Medium (Within 2min)**: Localized floods, major accidents
4. **Low (Batched)**: Minor accidents, traffic incidents

**Kill Switch Implementation:**
```python
# Redis-backed feature flags
if redis.get('kill_switch:global') == 'true':
    logger.warning("Global kill switch active, suppressing all alerts")
    return

if redis.get(f'kill_switch:alert:{alert_id}') == 'true':
    logger.warning(f"Alert {alert_id} suppressed by kill switch")
    return

# Proceed with FCM send
fcm.send_to_topic(topic, notification)
audit_log.record(alert_id, topic, timestamp)
```

### 3.3 API Gateway Endpoints

**Read Endpoints (Unauthenticated, Rate Limited):**
```
GET  /api/v1/hazards
     ?type=earthquake&region=ncr&since=2026-06-29T00:00:00Z
     
GET  /api/v1/hazards/{hazard_id}

GET  /api/v1/regions/{region_id}/active-hazards

GET  /api/v1/health
     Response: { "usgs": "ok", "gdacs": "ok", "open_meteo": "degraded" }
```

**Write Endpoints (Authenticated, Rate Limited):**
```
POST /api/v1/reports
     Body: { "type": "accident", "location": {...}, "photo": "base64..." }
     
DELETE /api/v1/reports/{report_id}
       (User can delete their own reports)

POST /admin/v1/kill-switch
     Body: { "alert_id": "123" } or { "global": true }
     Requires: Admin JWT token
```

**Rate Limiting:**
- Public reads: 100 req/min per IP
- Authenticated writes: 20 req/min per user
- User reports: 10 submissions per hour per user

**Caching Headers:**
```
Cache-Control: public, max-age=30
Age: 15
ETag: "33a64df551425fcc55e4d42a148795d9f25f89d4"
```

---

## 4. Flutter App Design

### 4.1 Feature Structure (Feature-First Architecture)

```
lib/
├── core/
│   ├── constants/
│   ├── error/
│   ├── network/
│   ├── utils/
│   └── widgets/
├── features/
│   ├── hazard_map/
│   │   ├── data/
│   │   │   ├── models/
│   │   │   ├── repositories/
│   │   │   └── datasources/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── repositories/
│   │   │   └── usecases/
│   │   └── presentation/
│   │       ├── bloc/
│   │       ├── pages/
│   │       └── widgets/
│   ├── earthquake/
│   ├── typhoon/
│   ├── flood/
│   ├── tsunami/
│   ├── accident/
│   ├── user_report/
│   ├── notifications/
│   └── settings/
└── main.dart
```

### 4.2 BLoC State Management Pattern

**Example: Earthquake BLoC**
```dart
// Events
abstract class EarthquakeEvent {}
class LoadEarthquakes extends EarthquakeEvent {}
class RefreshEarthquakes extends EarthquakeEvent {}
class FilterEarthquakesByRegion extends EarthquakeEvent {
  final String regionId;
}

// States
abstract class EarthquakeState {}
class EarthquakeLoading extends EarthquakeState {}
class EarthquakeLoaded extends EarthquakeState {
  final List<HazardRecord> earthquakes;
  final DateTime lastUpdated;
}
class EarthquakeError extends EarthquakeState {
  final String message;
}

// BLoC
class EarthquakeBloc extends Bloc<EarthquakeEvent, EarthquakeState> {
  final EarthquakeRepository repository;
  
  EarthquakeBloc(this.repository) : super(EarthquakeLoading()) {
    on<LoadEarthquakes>(_onLoadEarthquakes);
    on<RefreshEarthquakes>(_onRefreshEarthquakes);
  }
  
  Future<void> _onLoadEarthquakes(
    LoadEarthquakes event,
    Emitter<EarthquakeState> emit,
  ) async {
    emit(EarthquakeLoading());
    try {
      final earthquakes = await repository.getEarthquakes();
      emit(EarthquakeLoaded(earthquakes, DateTime.now()));
    } catch (e) {
      emit(EarthquakeError(e.toString()));
    }
  }
}
```

### 4.3 Offline-First Repository Pattern

```dart
abstract class HazardRepository {
  Future<List<HazardRecord>> getHazards({HazardType? type, String? region});
  Stream<HazardRecord> watchHazards();
}

class HazardRepositoryImpl implements HazardRepository {
  final HazardRemoteDataSource remoteDataSource;
  final HazardLocalDataSource localDataSource;
  final NetworkInfo networkInfo;
  
  @override
  Future<List<HazardRecord>> getHazards({HazardType? type, String? region}) async {
    if (await networkInfo.isConnected) {
      try {
        // Fetch from API
        final remoteHazards = await remoteDataSource.getHazards(type, region);
        
        // Cache locally
        await localDataSource.cacheHazards(remoteHazards);
        
        return remoteHazards;
      } catch (e) {
        // Fallback to cache on network error
        return await localDataSource.getCachedHazards(type, region);
      }
    } else {
      // Offline: serve from cache
      return await localDataSource.getCachedHazards(type, region);
    }
  }
  
  @override
  Stream<HazardRecord> watchHazards() {
    // Listen to local cache changes and remote updates
    return localDataSource.watchHazards();
  }
}
```

### 4.4 Map Integration (flutter_map + Mapbox)

**Layers:**
1. **Base Map Tiles**: Mapbox Streets (cached via flutter_map)
2. **Flood Hazard Zones**: GeoJSON polygon layer with color coding
3. **Earthquake Markers**: Circle markers scaled by magnitude
4. **Typhoon Track**: Polyline with forecast cone
5. **Tsunami Alerts**: Coastal region highlighting
6. **Accident Reports**: Custom icon markers

**Interaction:**
- Tap marker → Show hazard detail sheet
- Long press → Submit user report at location
- Zoom to user location → Request location permission if needed

### 4.5 Push Notification Handling

**FCM Setup:**
```dart
class NotificationService {
  final FirebaseMessaging _fcm = FirebaseMessaging.instance;
  
  Future<void> initialize() async {
    // Request permission
    await _fcm.requestPermission(
      alert: true,
      badge: true,
      sound: true,
    );
    
    // Get FCM token
    String? token = await _fcm.getToken();
    print('FCM Token: $token');
    
    // Subscribe to topics based on user preferences
    await _fcm.subscribeToTopic('earthquake_all');
    await _fcm.subscribeToTopic('tsunami_coastal');
    
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen(_handleForegroundMessage);
    
    // Handle background messages
    FirebaseMessaging.onBackgroundMessage(_firebaseMessagingBackgroundHandler);
  }
  
  void _handleForegroundMessage(RemoteMessage message) {
    // Display in-app notification banner
    showInAppAlert(message.notification?.title, message.notification?.body);
  }
}

@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  // Handle background notification
  await Firebase.initializeApp();
  print('Background message: ${message.messageId}');
}
```

### 4.6 Geofencing Implementation

```dart
import 'package:geofence_service/geofence_service.dart';

class GeofencingService {
  final GeofenceService _geofenceService = GeofenceService.instance.setup(
    interval: 5000, // Check every 5 seconds
    accuracy: 100,  // 100 meter accuracy
    loiteringDelayMs: 60000,
    statusChangeDelayMs: 10000,
  );
  
  void addHazardZone(HazardRecord hazard) {
    final geofence = Geofence(
      id: hazard.id,
      latitude: hazard.location.latitude,
      longitude: hazard.location.longitude,
      radius: [
        GeofenceRadius(id: 'radius_500m', length: 500),
      ],
    );
    
    _geofenceService.addGeofence(geofence);
  }
  
  void startMonitoring() {
    _geofenceService.addGeofenceStatusChangeListener(_onGeofenceStatusChanged);
    _geofenceService.start();
  }
  
  void _onGeofenceStatusChanged(
    Geofence geofence,
    GeofenceRadius geofenceRadius,
    GeofenceStatus geofenceStatus,
  ) {
    if (geofenceStatus == GeofenceStatus.ENTER) {
      // User entered hazard zone - trigger local notification
      _showHazardZoneAlert(geofence.id);
    }
  }
}
```

---

## 5. Security Considerations

### 5.1 API Security Measures

1. **HTTPS Everywhere**: No HTTP endpoints, TLS 1.3 minimum
2. **Rate Limiting**: Implemented at API Gateway with Redis
3. **Input Validation**: All query params validated against allowlists
4. **SQL Injection Prevention**: Parameterized queries only
5. **XSS Prevention**: User report text sanitized with HTML entity encoding
6. **Photo Upload Security**: 
   - File type validation (JPEG/PNG only)
   - Size limit 5MB
   - EXIF metadata stripping
   - Virus scanning before storage
7. **Authentication**: JWT tokens with 1-hour expiration
8. **CORS**: Restrict origins to mobile app package names

### 5.2 Privacy Protection

1. **Location Data**: Only stored when user explicitly submits report
2. **Device IDs**: Hashed before storage, not exposed in public API
3. **Data Retention**: User reports auto-deleted after 180 days
4. **User Deletion**: Provide endpoint to delete all user data
5. **Audit Logging**: Record all admin actions (kill switch, moderation)

### 5.3 Ingestion Service Isolation

- Run in separate container with restricted network access
- No access to user authentication database
- No direct API credentials
- 10MB response size limit on external requests
- 10 second timeout on all external requests
- HTML parsing with safe library (BeautifulSoup, Cheerio), no regex

---

## 6. Performance & Scalability

### 6.1 Backend Scaling Strategy

**Stateless API Design:**
- No session state in memory
- All state in PostgreSQL or Redis
- Enables horizontal scaling with load balancer

**Database Optimization:**
- PostGIS spatial indexes on hazard location columns
- Composite index on (hazard_type, timestamp, region)
- Read replicas for high-read traffic during disasters
- Connection pooling: 50 connections per instance

**Caching Strategy:**
- Redis cache for GET /hazards: 30 second TTL
- Redis cache for GET /hazards/region/{id}: 60 second TTL
- Cache invalidation on new hazard insert
- CDN for map tiles: 24 hour cache

**Message Queue Buffering:**
- Redis Pub/Sub for scraper → database writer
- Handles traffic spikes by buffering writes
- Database writer batches inserts (100 records per transaction)

### 6.2 Mobile App Performance

**Map Rendering:**
- Tile caching via flutter_map
- Lazy loading of hazard markers (only render visible viewport)
- Marker clustering at high zoom levels

**Local Database:**
- Hive/Isar for fast local queries
- Auto-purge records older than 30 days
- Lazy loading: Load 100 most recent records initially

**Network Optimization:**
- Dio HTTP client with retry logic
- GZIP compression on API responses
- Incremental sync: Only fetch records since last_sync_timestamp

---

## 7. Testing Strategy

### 7.1 Backend Testing

**Unit Tests:**
- Normalizer validation logic (magnitude ranges, coordinate bounds)
- Configuration parsing round-trip property tests
- JSON serialization round-trip property tests

**Integration Tests:**
- Full ingestion pipeline: scraper → normalizer → database
- API endpoint response validation
- Rate limiting enforcement

**Load Tests:**
- Simulate 10,000 concurrent users during disaster event
- Measure API response times under load
- Verify horizontal scaling effectiveness

### 7.2 Mobile App Testing

**Unit Tests:**
- BLoC state transitions
- Repository offline-first logic
- Geofencing zone calculations

**Widget Tests:**
- Map marker rendering
- Hazard detail sheet display
- Settings page interactions

**Integration Tests:**
- End-to-end: API fetch → cache → UI update
- Push notification handling
- Offline mode functionality

**Property-Based Tests:**
- HazardRecord serialization round-trip
- Coordinate validation edge cases

---

## 8. Deployment Architecture

### 8.1 Backend Infrastructure

**Cloud Provider:** AWS, Google Cloud, or Azure

**Components:**
- **Load Balancer**: AWS ALB or Google Cloud Load Balancing
- **API Service**: ECS/Fargate containers or Kubernetes pods (3+ instances)
- **Ingestion Service**: ECS/Fargate containers (2+ instances)
- **PostgreSQL**: Managed RDS/Cloud SQL with read replicas
- **Redis**: Managed ElastiCache/Memorystore
- **FCM**: Firebase Cloud Messaging (managed)
- **CDN**: CloudFront or Cloud CDN for map tiles

**Monitoring:**
- CloudWatch/Stackdriver for metrics
- Sentry for error tracking
- Prometheus + Grafana for custom dashboards

### 8.2 Mobile App Deployment

**Platforms:**
- Android: Google Play Store
- iOS: Apple App Store
- Web: Progressive Web App (PWA) hosted on Firebase Hosting

**CI/CD:**
- GitHub Actions or GitLab CI
- Automated builds on git tags
- Automated testing before deployment
- Staged rollout: 10% → 50% → 100% over 3 days

---

## 9. Future Enhancements (Out of Scope for MVP)

1. **Machine Learning**: Predict flood likelihood based on rainfall + historical data
2. **Augmented Reality**: AR view showing hazard zones overlaid on camera
3. **Social Features**: User-to-user messaging for coordinated evacuations
4. **Satellite Imagery**: Real-time satellite overlays for typhoon tracking
5. **Multi-Language Support**: Tagalog, Cebuano, Ilocano translations
6. **Accessibility**: Screen reader support, high contrast mode
7. **IoT Integration**: Direct feeds from government sensor networks

---

## 10. Open Questions & Decisions Needed

1. **Local Cache Technology**: Hive vs Isar? (Decision: Isar for better query performance)
2. **Backend Language**: Python vs Node.js? (Decision: Python for geospatial library ecosystem)
3. **Authentication**: Device ID only vs email/phone required? (Decision: Device ID minimum, email/phone optional)
4. **Map Provider**: Mapbox vs OpenStreetMap tiles? (Decision: OpenStreetMap for cost, Mapbox for quality)
5. **Moderation**: Manual review vs automated filtering? (Decision: Manual review for MVP, automated flagging for spam)

---

## Document Revision History

| Version | Date       | Author | Changes                     |
|---------|------------|--------|-----------------------------|
| 1.0     | 2026-06-30 | Kiro   | Initial design document     |
