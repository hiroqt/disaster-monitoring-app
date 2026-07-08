export enum HazardType {
  EARTHQUAKE = 'earthquake',
  TYPHOON = 'typhoon',
  FLOOD = 'flood',
  FIRE = 'fire',
  ACCIDENT = 'accident',
}

export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum ConfirmationStatus {
  CONFIRMED = 'confirmed',
  UNCONFIRMED = 'unconfirmed',
  MULTI_SOURCE_CONFIRMED = 'multi_source_confirmed',
}

export interface GeoPoint {
  latitude: number;
  longitude: number;
  accuracy_meters?: number;
  municipality?: string;
  province?: string;
  region?: string;
  barangay?: string;
  place_name?: string;
  landmarks?: string[];
  flood_prone_areas?: string[];
}

export interface EarthquakeMetadata {
  magnitude: number;
  depth_km: number;
  epicenter_name: string;
  tsunami_risk: boolean;
}

export interface TyphoonMetadata {
  wind_speed_kph: number;
  central_pressure_hpa?: number;
  forecast_track: Array<{
    lat: number;
    lon: number;
    timestamp: string;
  }>;
  affected_regions: string[];
}

export interface FloodMetadata {
  hazard_level: 'low' | 'medium' | 'high' | 'very_high';
  hazard_classification?: string;
  rainfall_current_hour_mm?: number;
  rainfall_last_3h_mm?: number;
  rainfall_last_6h_mm?: number;
  rainfall_last_12h_mm?: number;
  rainfall_last_24h_mm?: number;
  rainfall_daily_total_mm?: number;
  rainfall_intensity?: string;
  rainfall_category?: string;
  affected_barangay?: string;
  affected_municipality?: string;
  affected_province?: string;
  affected_region?: string;
  exact_coordinates?: {
    lat: number;
    lon: number;
    precision: string;
    datum?: string;
  };
  specific_flood_zones?: string[];
  nearby_landmarks?: string[];
  temperature_c?: number;
  wind_speed_kph?: number;
  wind_direction_deg?: number;
  relative_humidity_percent?: number;
  pressure_hpa?: number;
  weather_code?: number;
  weather_description?: string;
  flood_risk_level?: string;
  evacuation_recommended?: boolean;
  affected_population_estimate?: number;
  data_source?: string;
  observation_time?: string;
  forecast_valid_until?: string;
  next_update_time?: string;
}

export interface FireMetadata {
  fire_type: 'residential' | 'forest' | 'industrial' | 'vehicle' | 'other';
  fire_intensity: 'minor' | 'moderate' | 'major' | 'critical';
  affected_structures?: number;
  casualties?: number;
  injuries?: number;
  photo_url?: string;
  verified: boolean;
  reporter_id: string;
  fire_stations_responded?: string[];
  estimated_damage?: string;
}

export interface AccidentMetadata {
  incident_type: 'road_accident' | 'traffic_jam' | 'road_closure';
  severity: string;
  photo_url?: string;
  verified: boolean;
  reporter_id: string;
}

export type HazardMetadata =
  | EarthquakeMetadata
  | TyphoonMetadata
  | FloodMetadata
  | FireMetadata
  | AccidentMetadata;

export interface HazardRecord {
  id: string;
  type: HazardType;
  timestamp: string;
  location: GeoPoint;
  status: ConfirmationStatus;
  severity: Severity;
  metadata: HazardMetadata;
  sources: string[];
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UserReport {
  id?: string;
  reporterId: string;
  type: HazardType;
  location: GeoPoint;
  photoUrl?: string;
  description?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'spam';
  submittedAt?: string;
}

export interface NotificationPreferences {
  earthquake: boolean;
  typhoon: boolean;
  flood: boolean;
  fire: boolean;
  accident: boolean;
  region?: string;
}
