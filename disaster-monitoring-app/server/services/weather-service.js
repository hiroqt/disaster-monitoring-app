const axios = require('axios');

/**
 * Open-Meteo Weather API Service
 * Fetches weather data and flood risk indicators
 */
class WeatherService {
  constructor() {
    this.baseUrl = 'https://api.open-meteo.com/v1';
    // Trece Martires City, Cavite - Barangay monitoring locations
    this.monitoredLocations = [
      // City Center and key barangays
      { 
        name: 'Trece Martires City Hall', 
        municipality: 'Trece Martires City', 
        province: 'Cavite', 
        region: 'Region IV-A (CALABARZON)',
        barangay: 'Cabezas',
        lat: 14.2817, 
        lon: 120.8667,
        landmarks: ['City Hall', 'Public Market', 'Plaza'],
        flood_prone_areas: ['Low-lying areas near drainage']
      },
      { 
        name: 'San Agustin', 
        municipality: 'Trece Martires City', 
        province: 'Cavite', 
        region: 'Region IV-A (CALABARZON)',
        barangay: 'San Agustin',
        lat: 14.2950, 
        lon: 120.8550,
        landmarks: ['San Agustin Church', 'Residential Area'],
        flood_prone_areas: ['Creek areas', 'Low-lying residential zones']
      },
      { 
        name: 'Cabezas (Main)', 
        municipality: 'Trece Martires City', 
        province: 'Cavite', 
        region: 'Region IV-A (CALABARZON)',
        barangay: 'Cabezas',
        lat: 14.2820, 
        lon: 120.8700,
        landmarks: ['Commercial District', 'Schools'],
        flood_prone_areas: ['Street flood zones', 'Market area']
      },
      { 
        name: 'Gregorio (De Borja)', 
        municipality: 'Trece Martires City', 
        province: 'Cavite', 
        region: 'Region IV-A (CALABARZON)',
        barangay: 'De Borja (Gregorio)',
        lat: 14.2900, 
        lon: 120.8620,
        landmarks: ['Residential Communities'],
        flood_prone_areas: ['Drainage canals', 'Low terrain areas']
      },
      { 
        name: 'Lapidario (Bayog)', 
        municipality: 'Trece Martires City', 
        province: 'Cavite', 
        region: 'Region IV-A (CALABARZON)',
        barangay: 'Lapidario (Bayog)',
        lat: 14.2750, 
        lon: 120.8600,
        landmarks: ['Agricultural areas', 'Residential zones'],
        flood_prone_areas: ['Rice fields', 'Creek passages']
      },
      { 
        name: 'Osorio (Buena Suerte)', 
        municipality: 'Trece Martires City', 
        province: 'Cavite', 
        region: 'Region IV-A (CALABARZON)',
        barangay: 'Osorio (Buena Suerte)',
        lat: 14.2880, 
        lon: 120.8750,
        landmarks: ['Community center', 'Main road'],
        flood_prone_areas: ['Roadside areas', 'Low-lying sections']
      },
      { 
        name: 'Aguado', 
        municipality: 'Trece Martires City', 
        province: 'Cavite', 
        region: 'Region IV-A (CALABARZON)',
        barangay: 'Aguado',
        lat: 14.2700, 
        lon: 120.8650,
        landmarks: ['Rural area', 'Agricultural lands'],
        flood_prone_areas: ['Farm areas', 'Irrigation canals']
      },
    ];
  }

  /**
   * Fetch weather data and detect flood risks
   */
  async getWeatherHazards() {
    try {
      const hazards = [];

      for (const location of this.monitoredLocations) {
        const weather = await this.fetchWeatherData(location);
        
        // Check for flood conditions
        if (this.detectFloodRisk(weather, location)) {
          hazards.push(this.createFloodHazard(weather, location));
        }
      }

      return hazards;
    } catch (error) {
      console.error('Weather Service Error:', error.message);
      return [];
    }
  }

  /**
   * Fetch detailed weather data for a location
   */
  async fetchWeatherData(location) {
    try {
      const response = await axios.get(`${this.baseUrl}/forecast`, {
        params: {
          latitude: location.lat,
          longitude: location.lon,
          current: 'temperature_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m,relative_humidity_2m,pressure_msl',
          hourly: 'precipitation,rain,temperature_2m,relative_humidity_2m',
          daily: 'precipitation_sum,rain_sum,precipitation_hours',
          timezone: 'Asia/Manila',
          forecast_days: 2
        },
        timeout: 10000
      });

      return {
        location,
        current: response.data.current,
        hourly: response.data.hourly,
        daily: response.data.daily,
      };
    } catch (error) {
      console.error(`Weather fetch error for ${location.name}:`, error.message);
      return null;
    }
  }

  /**
   * Detect flood risk based on rainfall intensity and accumulation
   */
  detectFloodRisk(weather) {
    if (!weather || !weather.current) return false;

    const currentRain = weather.current.rain || 0;

    // Calculate hourly rainfall total for last 6 hours
    let recentRainfall = 0;
    let last24hRainfall = 0;
    if (weather.hourly && weather.hourly.precipitation) {
      // Last 6 hours
      const lastSixHours = weather.hourly.precipitation.slice(-6);
      recentRainfall = lastSixHours.reduce((sum, val) => sum + (val || 0), 0);
      
      // Last 24 hours
      const last24Hours = weather.hourly.precipitation.slice(-24);
      last24hRainfall = last24Hours.reduce((sum, val) => sum + (val || 0), 0);
    }

    // Flood risk thresholds based on PAGASA standards (mm)
    const HEAVY_RAIN_THRESHOLD = 7.5;        // Heavy rain (per hour)
    const INTENSE_RAIN_6H_THRESHOLD = 50;    // Intense rainfall (6-hour)
    const TORRENTIAL_RAIN_24H_THRESHOLD = 100; // Torrential rain (24-hour)

    return currentRain >= HEAVY_RAIN_THRESHOLD || 
           recentRainfall >= INTENSE_RAIN_6H_THRESHOLD ||
           last24hRainfall >= TORRENTIAL_RAIN_24H_THRESHOLD;
  }

  /**
   * Create comprehensive flood hazard record with precise location data for Trece Martires
   */
  createFloodHazard(weather, location) {
    const currentRain = weather.current.rain || weather.current.precipitation || 0;
    const timestamp = new Date().toISOString();

    // Calculate rainfall over different time periods
    let last1hRainfall = currentRain;
    let last3hRainfall = 0;
    let last6hRainfall = 0;
    let last12hRainfall = 0;
    let last24hRainfall = 0;

    if (weather.hourly && weather.hourly.precipitation) {
      const hourlyData = weather.hourly.precipitation;
      
      last3hRainfall = hourlyData.slice(-3).reduce((sum, val) => sum + (val || 0), 0);
      last6hRainfall = hourlyData.slice(-6).reduce((sum, val) => sum + (val || 0), 0);
      last12hRainfall = hourlyData.slice(-12).reduce((sum, val) => sum + (val || 0), 0);
      last24hRainfall = hourlyData.slice(-24).reduce((sum, val) => sum + (val || 0), 0);
    }

    // Get daily accumulation if available
    let dailyRainSum = 0;
    if (weather.daily && weather.daily.precipitation_sum && weather.daily.precipitation_sum.length > 0) {
      dailyRainSum = weather.daily.precipitation_sum[0] || 0;
    }

    const severity = this.calculateFloodSeverity(currentRain, last6hRainfall, last24hRainfall);
    const hazardLevel = this.determineHazardLevel(currentRain, last6hRainfall, last24hRainfall);

    return {
      id: `weather_flood_${location.barangay.replace(/\s+/g, '_')}_${Date.now()}`,
      type: 'flood',
      timestamp,
      location: { 
        // Exact coordinates
        latitude: location.lat, 
        longitude: location.lon,
        accuracy_meters: 500, // Barangay-level accuracy
        
        // Administrative divisions (precise)
        municipality: location.municipality,
        province: location.province,
        region: location.region,
        barangay: location.barangay,
        
        // Human-readable location
        place_name: `Barangay ${location.barangay}, ${location.municipality}, ${location.province}`,
        
        // Additional location context
        landmarks: location.landmarks || [],
        flood_prone_areas: location.flood_prone_areas || [],
      },
      status: 'confirmed',
      severity,
      metadata: {
        // Hazard classification
        hazard_level: hazardLevel,
        hazard_classification: this.getHazardClassification(hazardLevel),
        
        // Precise rainfall data (in millimeters)
        rainfall_current_hour_mm: parseFloat(last1hRainfall.toFixed(2)),
        rainfall_last_3h_mm: parseFloat(last3hRainfall.toFixed(2)),
        rainfall_last_6h_mm: parseFloat(last6hRainfall.toFixed(2)),
        rainfall_last_12h_mm: parseFloat(last12hRainfall.toFixed(2)),
        rainfall_last_24h_mm: parseFloat(last24hRainfall.toFixed(2)),
        rainfall_daily_total_mm: parseFloat(dailyRainSum.toFixed(2)),
        
        // Rainfall intensity classification
        rainfall_intensity: this.classifyRainfallIntensity(currentRain),
        rainfall_category: this.getRainfallCategory(last6hRainfall),
        
        // Precise location details
        affected_barangay: location.barangay,
        affected_municipality: location.municipality,
        affected_province: location.province,
        affected_region: location.region,
        
        // Exact coordinates with precision info
        exact_coordinates: {
          lat: location.lat,
          lon: location.lon,
          precision: 'barangay_level',
          datum: 'WGS84'
        },
        
        // Flood-prone area details
        specific_flood_zones: location.flood_prone_areas || [],
        nearby_landmarks: location.landmarks || [],
        
        // Additional weather conditions
        temperature_c: parseFloat((weather.current.temperature_2m || 0).toFixed(1)),
        wind_speed_kph: parseFloat((weather.current.wind_speed_10m || 0).toFixed(1)),
        wind_direction_deg: weather.current.wind_direction_10m || 0,
        relative_humidity_percent: weather.current.relative_humidity_2m || 0,
        pressure_hpa: weather.current.pressure_msl || 0,
        weather_code: weather.current.weather_code,
        weather_description: this.getWeatherDescription(weather.current.weather_code),
        
        // Risk assessment
        flood_risk_level: this.assessFloodRisk(last6hRainfall, last24hRainfall),
        evacuation_recommended: severity === 'critical' || hazardLevel === 'very_high',
        affected_population_estimate: this.estimateAffectedPopulation(location.barangay, hazardLevel),
        
        // Monitoring information
        data_source: 'Open-Meteo Weather API',
        observation_time: timestamp,
        forecast_valid_until: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(), // 3 hours
        next_update_time: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      },
      sources: ['Open-Meteo Weather API'],
      description: this.generateDetailedDescription(location, hazardLevel, last6hRainfall, currentRain),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  /**
   * Calculate flood severity based on multiple rainfall metrics
   */
  calculateFloodSeverity(currentRain, last6hRainfall, last24hRainfall) {
    // Critical conditions
    if (last24hRainfall >= 200 || last6hRainfall >= 150 || currentRain >= 30) return 'critical';
    
    // High severity
    if (last24hRainfall >= 100 || last6hRainfall >= 75 || currentRain >= 15) return 'high';
    
    // Medium severity
    if (last24hRainfall >= 50 || last6hRainfall >= 30 || currentRain >= 10) return 'medium';
    
    // Low severity
    return 'low';
  }

  /**
   * Determine hazard level (for FloodMetadata compatibility)
   */
  determineHazardLevel(currentRain, last6hRainfall, last24hRainfall) {
    if (last24hRainfall >= 200 || last6hRainfall >= 150 || currentRain >= 30) return 'very_high';
    if (last24hRainfall >= 100 || last6hRainfall >= 75 || currentRain >= 15) return 'high';
    if (last24hRainfall >= 50 || last6hRainfall >= 30 || currentRain >= 10) return 'medium';
    return 'low';
  }

  /**
   * Get hazard classification description
   */
  getHazardClassification(hazardLevel) {
    const classifications = {
      'very_high': 'Extreme Flood Risk - Immediate evacuation recommended',
      'high': 'High Flood Risk - Prepare to evacuate',
      'medium': 'Moderate Flood Risk - Stay alert and monitor updates',
      'low': 'Low Flood Risk - Normal precautions'
    };
    return classifications[hazardLevel] || 'Unknown risk level';
  }

  /**
   * Classify rainfall intensity based on current hourly rate
   */
  classifyRainfallIntensity(rainfallMm) {
    if (rainfallMm >= 30) return 'torrential';
    if (rainfallMm >= 15) return 'intense';
    if (rainfallMm >= 10) return 'heavy';
    if (rainfallMm >= 7.5) return 'moderate_heavy';
    if (rainfallMm >= 2.5) return 'moderate';
    if (rainfallMm >= 0.5) return 'light';
    return 'drizzle';
  }

  /**
   * Get rainfall category based on 6-hour accumulation
   */
  getRainfallCategory(rainfall6h) {
    if (rainfall6h >= 150) return 'Extreme';
    if (rainfall6h >= 75) return 'Very Heavy';
    if (rainfall6h >= 30) return 'Heavy';
    if (rainfall6h >= 15) return 'Moderate';
    return 'Light';
  }

  /**
   * Get weather description from WMO weather code
   */
  getWeatherDescription(code) {
    const descriptions = {
      0: 'Clear sky',
      1: 'Mainly clear',
      2: 'Partly cloudy',
      3: 'Overcast',
      45: 'Foggy',
      48: 'Depositing rime fog',
      51: 'Light drizzle',
      53: 'Moderate drizzle',
      55: 'Dense drizzle',
      61: 'Slight rain',
      63: 'Moderate rain',
      65: 'Heavy rain',
      71: 'Slight snow',
      73: 'Moderate snow',
      75: 'Heavy snow',
      80: 'Slight rain showers',
      81: 'Moderate rain showers',
      82: 'Violent rain showers',
      95: 'Thunderstorm',
      96: 'Thunderstorm with light hail',
      99: 'Thunderstorm with heavy hail'
    };
    return descriptions[code] || 'Unknown';
  }

  /**
   * Assess overall flood risk level
   */
  assessFloodRisk(rainfall6h, rainfall24h) {
    if (rainfall24h >= 200 || rainfall6h >= 150) return 'extreme';
    if (rainfall24h >= 100 || rainfall6h >= 75) return 'very_high';
    if (rainfall24h >= 50 || rainfall6h >= 30) return 'high';
    if (rainfall24h >= 25 || rainfall6h >= 15) return 'moderate';
    return 'low';
  }

  /**
   * Estimate affected population based on barangay and hazard level
   */
  estimateAffectedPopulation(barangay, hazardLevel) {
    // Approximate barangay populations in Trece Martires City
    const barangayPopulations = {
      'Cabezas': 8500,
      'San Agustin': 7200,
      'De Borja (Gregorio)': 6800,
      'Lapidario (Bayog)': 5500,
      'Osorio (Buena Suerte)': 6200,
      'Aguado': 4800,
    };

    const basePop = barangayPopulations[barangay] || 5000;

    // Percentage affected based on hazard level
    const affectedRates = {
      'very_high': 0.7,  // 70% affected
      'high': 0.4,       // 40% affected
      'medium': 0.2,     // 20% affected
      'low': 0.05        // 5% affected
    };

    const rate = affectedRates[hazardLevel] || 0.1;
    return Math.round(basePop * rate);
  }

  /**
   * Generate detailed human-readable description
   */
  generateDetailedDescription(location, hazardLevel, rainfall6h, currentRain) {
    const barangayName = location.barangay;
    const municipality = location.municipality;
    const intensity = this.classifyRainfallIntensity(currentRain);
    const category = this.getRainfallCategory(rainfall6h);

    let description = `${category} rainfall detected in Barangay ${barangayName}, ${municipality}. `;
    description += `Current rainfall intensity: ${intensity} (${currentRain.toFixed(1)}mm/hr). `;
    description += `6-hour total: ${rainfall6h.toFixed(1)}mm. `;
    description += `Flood hazard level: ${hazardLevel.toUpperCase()}. `;

    if (location.flood_prone_areas && location.flood_prone_areas.length > 0) {
      description += `Specific areas at risk: ${location.flood_prone_areas.join(', ')}. `;
    }

    if (hazardLevel === 'very_high' || hazardLevel === 'high') {
      description += `⚠️ Immediate action recommended for residents in flood-prone areas.`;
    } else if (hazardLevel === 'medium') {
      description += `Stay alert and monitor local advisories.`;
    }

    return description;
  }
}

module.exports = new WeatherService();
