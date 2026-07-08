# Requirements Document

## Introduction

This document specifies the requirements for a cross-platform Flutter mobile application that monitors and alerts Filipino citizens about five critical disaster types: floods, earthquakes, tsunamis, typhoons, and road accidents. The system aggregates data from multiple international and Philippine government sources, stores data locally for offline access, and delivers real-time alerts via push notifications. The application must operate reliably during infrastructure failures that commonly occur during disasters.

## Glossary

- **Disaster_Monitoring_App**: The Flutter mobile application running on user devices (Android, Web)
- **Ingestion_Service**: Backend service responsible for fetching, parsing, and validating hazard data from external sources
- **Normalizer**: Component that transforms heterogeneous raw data into a unified hazard data model
- **Alert_Engine**: Component that evaluates hazard data and triggers push notifications based on user subscription settings
- **Local_Cache**: On-device persistent storage (Hive or Isar) that enables offline access
- **Hazard_Record**: A validated, normalized data structure representing a single disaster event or warning
- **USGS**: United States Geological Survey (earthquake data provider)
- **GDACS**: Global Disaster Alert and Coordination System (multi-hazard data provider)
- **PHIVOLCS**: Philippine Institute of Volcanology and Seismology
- **PAGASA**: Philippine Atmospheric, Geophysical and Astronomical Services Administration
- **MMDA**: Metropolitan Manila Development Authority
- **Project_NOAH**: Nationwide Operational Assessment of Hazards (Philippine hazard mapping dataset)
- **FCM**: Firebase Cloud Messaging (push notification service)
- **Philippine_Bounding_Box**: Geographic area bounded by 4°N–21°N latitude and 116°E–127°E longitude
- **User_Report**: Crowdsourced disaster report submitted by an authenticated user
- **Moderation_Queue**: System component that holds User_Reports for approval before public display
- **Kill_Switch**: Administrative control that immediately suppresses specific alerts or pauses all push notifications
- **Validation_Rules**: Criteria used to verify hazard data integrity before triggering alerts
- **Topic_Subscription**: User preference for receiving alerts about specific hazard types or geographic regions
- **Audit_Trail**: Persistent log of all push notifications sent, including timestamp, content, and recipient count
- **Geofencing**: Geographic boundary monitoring that triggers alerts when user location intersects hazard zones

## Requirements

### Requirement 1: Real-Time Earthquake Monitoring

**User Story:** As a Filipino resident, I want to receive immediate notifications about earthquakes, so that I can take protective action and assess tsunami risk.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL establish WebSocket connections to USGS real-time earthquake GeoJSON feeds
2. WHEN a new earthquake record is received, THE Normalizer SHALL parse magnitude, epicenter coordinates, depth, and timestamp within 5 seconds
3. WHEN parsing an earthquake record, THE Normalizer SHALL reject records with magnitude outside the range 0.1 to 10.0
4. WHEN parsing an earthquake record, THE Normalizer SHALL reject records with epicenter coordinates outside the Philippine_Bounding_Box
5. WHEN parsing an earthquake record, THE Normalizer SHALL reject records with timestamps in the future or older than 48 hours
6. WHEN USGS and PHIVOLCS both report the same earthquake within 50km distance and 2 minutes time difference, THE Normalizer SHALL mark the Hazard_Record as confirmed
7. WHEN only one source reports an earthquake, THE Normalizer SHALL mark the Hazard_Record as unconfirmed
8. WHEN a confirmed earthquake Hazard_Record has magnitude ≥ 5.0, THE Alert_Engine SHALL trigger push notifications to users subscribed to earthquake alerts
9. THE Disaster_Monitoring_App SHALL display earthquake events on an interactive map using flutter_map
10. THE Local_Cache SHALL store the most recent 1000 earthquake Hazard_Records for offline access

### Requirement 2: Typhoon and Weather Hazard Tracking

**User Story:** As a Filipino resident, I want to track approaching typhoons and severe weather, so that I can prepare for evacuation or shelter in place.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL poll Open-Meteo weather API every 15 minutes using REST via dio HTTP client
2. WHEN weather data is received, THE Normalizer SHALL extract tropical cyclone location, wind speed, track forecast, and affected regions
3. WHEN Open-Meteo API request fails, THE Ingestion_Service SHALL retry with exponential backoff up to 3 attempts
4. WHEN maximum retries are exhausted, THE Ingestion_Service SHALL log the failure and continue operating for other hazard types
5. THE Ingestion_Service SHALL enforce a daily limit of 9500 API calls to Open-Meteo to stay within the 10,000 free tier limit
6. WHEN a typhoon enters the Philippine_Bounding_Box with wind speed ≥ 118 km/h (typhoon category), THE Alert_Engine SHALL trigger push notifications to users in projected impact zones
7. THE Disaster_Monitoring_App SHALL display typhoon track forecasts with confidence cones on the map
8. THE Local_Cache SHALL store the most recent 50 typhoon track forecasts for offline access
9. WHEN the Disaster_Monitoring_App is offline, THE Disaster_Monitoring_App SHALL display cached weather data with a "last updated" timestamp

### Requirement 3: Flood Hazard Map Integration

**User Story:** As a Filipino resident, I want to see flood-prone areas on the map, so that I can avoid dangerous routes during heavy rainfall.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL download Project_NOAH flood hazard shapefiles from HuggingFace during initial setup
2. THE Disaster_Monitoring_App SHALL render flood hazard zones on the map with color-coded severity levels (low, medium, high, very high)
3. THE Disaster_Monitoring_App SHALL overlay current rainfall intensity data from Open-Meteo on flood hazard zones
4. WHEN user location falls within a high or very high flood hazard zone during active heavy rainfall (>20mm/hour), THE Alert_Engine SHALL trigger a localized flood warning push notification
5. THE Local_Cache SHALL store simplified flood hazard geometries for the user's current region for offline rendering
6. WHEN the map is zoomed to municipal level or closer, THE Disaster_Monitoring_App SHALL display detailed flood hazard boundaries

### Requirement 4: Tsunami Alert Integration

**User Story:** As a coastal Filipino resident, I want immediate tsunami warnings, so that I can evacuate to higher ground.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL fetch GDACS GeoRSS feeds for tsunami alerts every 5 minutes
2. WHEN a tsunami alert is detected within the Philippine_Bounding_Box, THE Normalizer SHALL extract wave height estimate, affected coastlines, and estimated arrival time
3. WHEN a tsunami Hazard_Record is validated, THE Alert_Engine SHALL immediately trigger push notifications to all users in coastal regions regardless of subscription settings
4. THE Disaster_Monitoring_App SHALL display tsunami alerts with maximum visual prominence (red banner, persistent notification)
5. WHEN an earthquake with magnitude ≥ 7.0 and depth ≤ 70km occurs within 500km of Philippine coastlines, THE Alert_Engine SHALL trigger a precautionary tsunami alert even if no official tsunami warning exists
6. THE Local_Cache SHALL store the most recent 10 tsunami alerts for offline access

### Requirement 5: Road Accident and Traffic Incident Reporting

**User Story:** As a Filipino driver, I want to see road accidents and traffic incidents, so that I can choose safer alternative routes.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL poll TomTom Traffic API, MMDA social media feeds, and MapaKalamidad.ph every 10 minutes for road incident data
2. WHEN incident data is received, THE Normalizer SHALL extract incident type, location, severity, and timestamp
3. THE Disaster_Monitoring_App SHALL display road accidents as map markers with incident-type icons
4. THE Local_Cache SHALL store road incidents from the past 24 hours for offline viewing
5. WHEN the Ingestion_Service detects MMDA social media is unavailable, THE Ingestion_Service SHALL continue operating with remaining traffic data sources

### Requirement 6: Crowdsourced Accident Report Submission

**User Story:** As a Filipino citizen, I want to report accidents I witness, so that I can help warn other drivers and contribute to community safety.

#### Acceptance Criteria

1. THE Disaster_Monitoring_App SHALL require user authentication (device ID minimum, email/phone verification preferred) before accepting User_Reports
2. WHEN a user submits a User_Report, THE Disaster_Monitoring_App SHALL capture location, incident type, optional photo, and optional description
3. WHEN a User_Report includes an uploaded photo, THE Ingestion_Service SHALL validate file type is JPEG or PNG and file size is ≤ 5MB
4. WHEN a User_Report includes an uploaded photo, THE Ingestion_Service SHALL strip EXIF location metadata before storage
5. WHEN a User_Report is submitted, THE Ingestion_Service SHALL validate coordinates fall within the Philippine_Bounding_Box
6. WHEN a User_Report is submitted, THE Ingestion_Service SHALL sanitize free-text description fields to prevent XSS attacks
7. THE Ingestion_Service SHALL enforce a rate limit of 10 User_Reports per user per hour
8. WHEN a User_Report is received, THE Moderation_Queue SHALL hold it for approval before public display
9. THE Disaster_Monitoring_App SHALL display unverified User_Reports with distinct visual styling (different icon, "unverified" label)
10. WHEN multiple User_Reports are submitted from the same device within 1km radius and 10 minutes, THE Ingestion_Service SHALL flag them for manual review as potential spam

### Requirement 7: Offline-First Data Architecture

**User Story:** As a Filipino resident, I want the app to work during network outages, so that I can access hazard information when infrastructure fails during disasters.

#### Acceptance Criteria

1. THE Disaster_Monitoring_App SHALL store all Hazard_Records in the Local_Cache immediately upon receipt
2. WHEN the Disaster_Monitoring_App detects no network connectivity, THE Disaster_Monitoring_App SHALL serve all map and hazard data from the Local_Cache
3. WHEN the Disaster_Monitoring_App is offline, THE Disaster_Monitoring_App SHALL display a banner indicating "Offline Mode - Showing Cached Data"
4. WHEN the Disaster_Monitoring_App is offline, THE Disaster_Monitoring_App SHALL display the timestamp of the most recent successful data sync
5. WHEN network connectivity is restored, THE Disaster_Monitoring_App SHALL synchronize cached data with the backend within 30 seconds
6. THE Local_Cache SHALL automatically purge Hazard_Records older than 30 days to manage storage space
7. WHEN Local_Cache storage exceeds 500MB, THE Disaster_Monitoring_App SHALL prompt the user to clear old cached map tiles

### Requirement 8: Push Notification Management

**User Story:** As a Filipino resident, I want to customize which disaster alerts I receive, so that I only get notifications relevant to my location and concerns.

#### Acceptance Criteria

1. THE Disaster_Monitoring_App SHALL allow users to create Topic_Subscriptions for specific hazard types (earthquakes, typhoons, floods, tsunamis, accidents)
2. THE Disaster_Monitoring_App SHALL allow users to create Topic_Subscriptions for specific geographic regions (province or municipal level)
3. WHEN a Hazard_Record matches a user's Topic_Subscriptions, THE Alert_Engine SHALL send a push notification via FCM
4. THE Alert_Engine SHALL batch push notifications and use FCM topic-based subscriptions rather than sending to individual devices
5. WHEN tsunami alerts are triggered, THE Alert_Engine SHALL bypass Topic_Subscriptions and send to all users in coastal regions
6. WHEN FCM push delivery fails or is delayed beyond 60 seconds, THE Disaster_Monitoring_App SHALL display the alert prominently on next app open
7. THE Disaster_Monitoring_App SHALL allow users to enable or disable push notifications per hazard type in app settings

### Requirement 9: Data Validation and Alert Integrity

**User Story:** As a Filipino resident, I want to trust that disaster alerts are accurate, so that I do not panic from false alarms or miss real emergencies.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL validate every Hazard_Record against Validation_Rules before passing to the Alert_Engine
2. WHEN cross-checking reveals conflicting data between sources for the same event, THE Normalizer SHALL flag the Hazard_Record for manual review and delay push notification
3. THE Alert_Engine SHALL maintain an Audit_Trail recording timestamp, content, hazard type, and recipient count for every push notification sent
4. THE Alert_Engine SHALL expose a Kill_Switch endpoint requiring administrator authentication
5. WHEN the Kill_Switch is activated for a specific alert ID, THE Alert_Engine SHALL immediately suppress that alert and prevent further push notifications
6. WHEN the Kill_Switch is activated globally, THE Alert_Engine SHALL pause all push notifications until manually re-enabled
7. THE Ingestion_Service SHALL log raw_payload data for every scraped source to enable post-incident investigation of false alerts

### Requirement 10: Multi-Hazard Data Aggregation via GDACS

**User Story:** As a Filipino resident, I want a unified view of all active disasters, so that I can assess compound risks in my area.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL fetch GDACS GeoRSS feeds every 5 minutes without authentication
2. WHEN GDACS data is received, THE Normalizer SHALL extract hazard type, severity level (green/orange/red), affected area, and event description
3. THE Normalizer SHALL map GDACS hazard types to application hazard categories (flood, earthquake, tsunami, typhoon)
4. THE Disaster_Monitoring_App SHALL display a unified hazard layer on the map showing all active GDACS alerts
5. WHEN GDACS provides alerts already covered by other sources (USGS earthquakes), THE Normalizer SHALL merge them into a single Hazard_Record marked as multi-source confirmed

### Requirement 11: Background Geofencing for Location-Based Alerts

**User Story:** As a Filipino resident, I want automatic alerts when I enter hazardous areas, so that I am warned even if I forget to check the app.

#### Acceptance Criteria

1. THE Disaster_Monitoring_App SHALL request background location permission from the user on first launch
2. WHEN background location permission is granted, THE Disaster_Monitoring_App SHALL monitor user location using geofencing with minimum 500-meter radius zones
3. WHEN user location enters a geofenced hazard zone (active flood area, recent earthquake epicenter within 50km, typhoon projected path), THE Alert_Engine SHALL trigger a local push notification
4. THE Disaster_Monitoring_App SHALL allow users to disable background location monitoring in privacy settings
5. WHEN background location monitoring is disabled, THE Disaster_Monitoring_App SHALL use manually-set home region for alert filtering
6. THE Disaster_Monitoring_App SHALL display current location permission status and battery impact warning in settings

### Requirement 12: State Management with BLoC Pattern

**User Story:** As a developer, I want predictable state management, so that the app remains maintainable as complexity grows.

#### Acceptance Criteria

1. THE Disaster_Monitoring_App SHALL implement BLoC (Business Logic Component) pattern for all state management
2. THE Disaster_Monitoring_App SHALL separate business logic from UI rendering across all features
3. WHEN a Hazard_Record is received, THE BLoC SHALL emit a new state triggering UI updates on the map and hazard list
4. THE Disaster_Monitoring_App SHALL maintain separate BLoCs for map interactions, hazard data, user preferences, and authentication
5. WHEN the app is backgrounded, THE BLoC SHALL persist current state to enable restoration on app resume

### Requirement 13: API Security and Rate Limiting

**User Story:** As a system administrator, I want protected backend endpoints, so that the service remains available during traffic spikes and resists abuse.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL enforce HTTPS for all API endpoints with no exceptions
2. THE Ingestion_Service SHALL require authentication tokens for all write endpoints (User_Report submission, moderation actions)
3. THE Ingestion_Service SHALL allow unauthenticated access to read endpoints (hazard data queries) with rate limiting applied
4. THE Ingestion_Service SHALL enforce a rate limit of 100 requests per minute per IP address for public read endpoints
5. THE Ingestion_Service SHALL enforce a rate limit of 20 requests per minute per authenticated user for write endpoints
6. WHEN rate limits are exceeded, THE Ingestion_Service SHALL return HTTP 429 status with a Retry-After header
7. THE Ingestion_Service SHALL validate all query parameters (region, hazard type, date ranges) against an allowlist before processing
8. THE Ingestion_Service SHALL use parameterized database queries exclusively and reject string concatenation of user input

### Requirement 14: Caching Strategy for High-Read Traffic

**User Story:** As a system administrator, I want aggressive caching during disaster events, so that the backend can handle traffic spikes without degradation.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL cache responses for GET /hazards endpoint for 30 seconds using Redis
2. THE Ingestion_Service SHALL cache responses for GET /hazards/region/{region_id} endpoint for 60 seconds using Redis
3. WHEN a new Hazard_Record triggers push notifications, THE Ingestion_Service SHALL invalidate relevant cache entries
4. THE Disaster_Monitoring_App SHALL serve map tiles from a CDN with 24-hour cache duration
5. THE Disaster_Monitoring_App SHALL cache static assets (icons, app images) with 7-day cache duration
6. WHEN cached data is served, THE Ingestion_Service SHALL include Cache-Control and Age headers in HTTP response

### Requirement 15: Graceful Degradation and Health Monitoring

**User Story:** As a system administrator, I want the system to operate partially when individual components fail, so that users retain access to available hazard data during outages.

#### Acceptance Criteria

1. WHEN a single data source (USGS, GDACS, Open-Meteo, PHIVOLCS, MMDA) fails, THE Ingestion_Service SHALL continue operating for all other hazard types
2. THE Ingestion_Service SHALL expose a health check endpoint returning status per data source including last successful fetch timestamp
3. THE Ingestion_Service SHALL set HTTP timeouts of 10 seconds and response size limits of 10MB for all external data source requests
4. WHEN a data source timeout occurs, THE Ingestion_Service SHALL log the failure and skip to the next scheduled poll without blocking other sources
5. THE Disaster_Monitoring_App SHALL display per-hazard-type "last updated" timestamps in the UI
6. WHEN a data source has not updated in 60 minutes, THE Disaster_Monitoring_App SHALL display a warning banner for that hazard type
7. WHEN the backend API is unreachable, THE Disaster_Monitoring_App SHALL continue operating in offline mode using Local_Cache without crashing

### Requirement 16: Data Privacy and Retention

**User Story:** As a Filipino resident, I want control over my location data, so that I can use the app while maintaining privacy.

#### Acceptance Criteria

1. THE Disaster_Monitoring_App SHALL display a privacy policy on first launch explaining data collection practices
2. THE Disaster_Monitoring_App SHALL request location permission only when needed (submitting User_Report, centering map, enabling geofencing)
3. THE Ingestion_Service SHALL store user location data only when explicitly provided for User_Report submission or geofencing opt-in
4. THE Ingestion_Service SHALL automatically delete User_Reports older than 180 days
5. THE Disaster_Monitoring_App SHALL provide a user settings option to delete all submitted User_Reports and associated data
6. THE Ingestion_Service SHALL not expose other users' precise device identifiers or submission locations in public API responses
7. THE Disaster_Monitoring_App SHALL allow users to use a manually-set home region instead of GPS for alert filtering

### Requirement 17: Ingestion Service Isolation and Security

**User Story:** As a system administrator, I want scrapers isolated from core services, so that malicious responses from compromised sources cannot affect the main API.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL run in a separate process or container isolated from the main API service
2. THE Ingestion_Service SHALL parse HTML responses using a dedicated HTML parsing library and reject regex-based parsing
3. THE Ingestion_Service SHALL enforce rate limiting on outbound requests to each external source (1 request per 15 minutes to PAGASA, 1 request per 5 minutes to GDACS)
4. WHEN an external source returns a response exceeding 10MB, THE Ingestion_Service SHALL terminate the connection and log an error
5. THE Ingestion_Service SHALL sanitize and validate all scraped data before writing to the shared database
6. THE Ingestion_Service SHALL not have direct access to user-facing API credentials or user authentication tables
7. WHEN the Ingestion_Service process crashes, THE system SHALL automatically restart it within 30 seconds without affecting the main API availability

### Requirement 18: Horizontal Scalability for Traffic Spikes

**User Story:** As a system administrator, I want the backend to scale horizontally, so that the system can handle traffic surges during major disasters.

#### Acceptance Criteria

1. THE Ingestion_Service main API SHALL be stateless and store no session state in process memory
2. THE Ingestion_Service SHALL support running multiple instances behind a load balancer with session affinity disabled
3. THE Ingestion_Service SHALL use a message queue (pub/sub pattern) for scraped data ingestion to decouple scraping from database writes
4. WHEN database write latency increases, THE message queue SHALL buffer incoming Hazard_Records without blocking scrapers
5. THE Ingestion_Service SHALL use database connection pooling with a maximum pool size of 50 connections per instance
6. WHEN horizontal scaling adds new API instances, THE system SHALL distribute traffic evenly within 30 seconds

### Requirement 19: Configuration Parsing and Serialization with Round-Trip Validation

**User Story:** As a developer, I want reliable configuration file parsing, so that deployment settings are loaded correctly across environments.

#### Acceptance Criteria

1. THE Ingestion_Service SHALL parse YAML configuration files containing API keys, database URLs, rate limits, and feature flags
2. WHEN an invalid configuration file is provided, THE Configuration_Parser SHALL return a descriptive error identifying the line and validation failure
3. THE Configuration_Pretty_Printer SHALL format Configuration objects back into valid YAML files preserving comments and structure
4. FOR ALL valid Configuration objects, parsing then printing then parsing SHALL produce an equivalent object (round-trip property)
5. THE Configuration_Parser SHALL validate required fields are present (database URL, FCM credentials, external API endpoints)
6. THE Configuration_Parser SHALL validate data types (integer port numbers, boolean flags, URL format for endpoints)

### Requirement 20: Hazard Data Serialization with Round-Trip Validation

**User Story:** As a developer, I want reliable hazard data serialization, so that data integrity is maintained between services and storage.

#### Acceptance Criteria

1. THE Normalizer SHALL serialize Hazard_Records to JSON format for API responses and Local_Cache storage
2. WHEN a Hazard_Record contains special characters in text fields, THE JSON_Serializer SHALL escape them correctly
3. THE JSON_Parser SHALL deserialize JSON-formatted Hazard_Records back into structured objects
4. FOR ALL valid Hazard_Records, serializing then deserializing then serializing SHALL produce equivalent JSON (round-trip property)
5. THE JSON_Parser SHALL reject malformed JSON and return a descriptive error without crashing
6. THE JSON_Serializer SHALL format timestamps in ISO 8601 format with UTC timezone
