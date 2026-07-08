const usgsService = require('./usgs-service');
const gdacsService = require('./gdacs-service');
const weatherService = require('./weather-service');

/**
 * Data Aggregator Service
 * Aggregates data from multiple sources and manages caching
 */
class DataAggregator {
  constructor() {
    this.cache = {
      hazards: [],
      lastUpdate: null,
      updateInterval: 5 * 60 * 1000, // 5 minutes
    };
    this.isUpdating = false;
  }

  /**
   * Get all hazards (from cache or fetch new)
   * Filters to last 7 days and Trece Martires area (except typhoons)
   */
  async getAllHazards(forceRefresh = false) {
    const now = Date.now();
    const cacheExpired = !this.cache.lastUpdate || 
      (now - this.cache.lastUpdate) > this.cache.updateInterval;

    if (forceRefresh || cacheExpired) {
      if (!this.isUpdating) {
        this.updateCache();
      }
    }

    // Add sample data for Trece Martires area
    const sampleData = this.getTreceMartiresSampleData();
    const combinedHazards = [...this.cache.hazards, ...sampleData];
    
    // Filter for last 7 days only
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const recentHazards = combinedHazards.filter(h => {
      const hazardDate = new Date(h.timestamp);
      return hazardDate >= sevenDaysAgo;
    });

    // Filter for Trece Martires area (except typhoons which affect wider regions)
    const treceMartires = { lat: 14.2832, lon: 120.8660 };
    const radiusKm = 50; // 50km radius around Trece Martires
    
    const filteredHazards = recentHazards.filter(h => {
      // Typhoons affect wider regions, keep all of them
      if (h.type === 'typhoon') return true;
      
      // Filter other hazards to Trece Martires area
      const distance = this.calculateDistance(
        treceMartires.lat, 
        treceMartires.lon,
        h.location.latitude,
        h.location.longitude
      );
      
      return distance <= radiusKm;
    });
    
    // Deduplicate and return
    return this.deduplicateHazards(filteredHazards);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Update cache with fresh data from all sources
   */
  async updateCache() {
    if (this.isUpdating) return;

    this.isUpdating = true;
    console.log('🔄 Fetching data from external sources...');

    try {
      const [earthquakes, disasters, weatherHazards] = await Promise.allSettled([
        usgsService.getRecentEarthquakes(),
        gdacsService.getRecentDisasters(),
        weatherService.getWeatherHazards(),
      ]);

      const allHazards = [];

      if (earthquakes.status === 'fulfilled') {
        console.log(`✅ USGS: ${earthquakes.value.length} earthquakes`);
        allHazards.push(...earthquakes.value);
      } else {
        console.error('❌ USGS fetch failed:', earthquakes.reason?.message);
      }

      if (disasters.status === 'fulfilled') {
        console.log(`✅ GDACS: ${disasters.value.length} disasters`);
        allHazards.push(...disasters.value);
      } else {
        console.error('❌ GDACS fetch failed:', disasters.reason?.message);
      }

      if (weatherHazards.status === 'fulfilled') {
        console.log(`✅ Weather: ${weatherHazards.value.length} flood risks`);
        allHazards.push(...weatherHazards.value);
      } else {
        console.error('❌ Weather fetch failed:', weatherHazards.reason?.message);
      }

      // Deduplicate hazards by ID
      const uniqueHazards = this.deduplicateHazards(allHazards);

      // Sort by timestamp (newest first)
      uniqueHazards.sort((a, b) => 
        new Date(b.timestamp) - new Date(a.timestamp)
      );

      this.cache.hazards = uniqueHazards;
      this.cache.lastUpdate = Date.now();

      console.log(`✨ Cache updated: ${uniqueHazards.length} total hazards`);
    } catch (error) {
      console.error('❌ Cache update error:', error.message);
    } finally {
      this.isUpdating = false;
    }
  }

  /**
   * Remove duplicate hazards (prefer multi-source confirmations)
   */
  deduplicateHazards(hazards) {
    const hazardMap = new Map();

    for (const hazard of hazards) {
      const key = this.generateHazardKey(hazard);
      
      if (!hazardMap.has(key)) {
        hazardMap.set(key, hazard);
      } else {
        // Merge sources if same event
        const existing = hazardMap.get(key);
        existing.sources = [...new Set([...existing.sources, ...hazard.sources])];
        
        // Update status if multi-source
        if (existing.sources.length > 1) {
          existing.status = 'multi_source_confirmed';
        }
      }
    }

    return Array.from(hazardMap.values());
  }

  /**
   * Generate unique key for hazard deduplication
   */
  generateHazardKey(hazard) {
    const lat = hazard.location.latitude.toFixed(2);
    const lon = hazard.location.longitude.toFixed(2);
    const time = new Date(hazard.timestamp).toISOString().slice(0, 13); // Hour precision
    return `${hazard.type}_${lat}_${lon}_${time}`;
  }

  /**
   * Get hazard by ID
   */
  getHazardById(id) {
    return this.cache.hazards.find(h => h.id === id);
  }

  /**
   * Filter hazards
   */
  filterHazards(filters) {
    let filtered = [...this.cache.hazards];

    if (filters.type) {
      filtered = filtered.filter(h => h.type === filters.type);
    }

    if (filters.severity) {
      filtered = filtered.filter(h => h.severity === filters.severity);
    }

    if (filters.since) {
      const sinceDate = new Date(filters.since);
      filtered = filtered.filter(h => new Date(h.timestamp) >= sinceDate);
    }

    if (filters.region) {
      // For demo, filter by proximity to major cities
      // In production, would use proper geographic regions
      filtered = filtered.filter(h => this.isInRegion(h, filters.region));
    }

    return filtered;
  }

  /**
   * Check if hazard is in specified region
   */
  isInRegion(hazard, region) {
    // Simple region mapping (can be expanded)
    const regions = {
      'ncr': { minLat: 14.3, maxLat: 14.8, minLon: 120.8, maxLon: 121.2 },
      'luzon': { minLat: 12.0, maxLat: 19.0, minLon: 119.0, maxLon: 123.0 },
      'visayas': { minLat: 9.0, maxLat: 13.0, minLon: 122.0, maxLon: 126.0 },
      'mindanao': { minLat: 5.0, maxLat: 10.0, minLon: 122.0, maxLon: 127.0 },
    };

    const bounds = regions[region.toLowerCase()];
    if (!bounds) return true; // Unknown region, include all

    const lat = hazard.location.latitude;
    const lon = hazard.location.longitude;

    return (
      lat >= bounds.minLat &&
      lat <= bounds.maxLat &&
      lon >= bounds.minLon &&
      lon <= bounds.maxLon
    );
  }

  /**
   * Generate sample data for Trece Martires area (last 7 days only)
   */
  getTreceMartiresSampleData() {
    const now = new Date();
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    const sampleData = [];

    // Trece Martires coordinates: 14.2832° N, 120.8660° E
    const baseLocation = {
      latitude: 14.2832,
      longitude: 120.8660,
      municipality: 'Trece Martires',
      province: 'Cavite',
      region: 'CALABARZON (Region IV-A)',
    };

    // Generate random times within last 7 days for variety
    const getRandomPastTime = (maxDaysAgo) => {
      const maxMs = maxDaysAgo * 24 * 60 * 60 * 1000;
      const randomMs = Math.random() * maxMs;
      return new Date(now - randomMs);
    };

    // Sample Fire Incidents
    sampleData.push({
      id: 'fire_trecemartires_001',
      type: 'fire',
      timestamp: getRandomPastTime(2).toISOString(), // Within last 2 days
      location: {
        ...baseLocation,
        latitude: baseLocation.latitude + 0.01,
        longitude: baseLocation.longitude + 0.005,
        barangay: 'Cabezas',
        place_name: 'Residential Area, Cabezas',
      },
      status: 'confirmed',
      severity: 'high',
      metadata: {
        fire_type: 'residential',
        fire_intensity: 'major',
        affected_structures: 3,
        casualties: 0,
        injuries: 2,
        verified: true,
        reporter_id: 'user_001',
        fire_stations_responded: ['Trece Martires Fire Station', 'Indang Fire Station'],
        estimated_damage: '₱500,000',
      },
      sources: ['user_report'],
      description: 'Residential fire affecting 3 houses in Barangay Cabezas',
      createdAt: getRandomPastTime(2).toISOString(),
      updatedAt: getRandomPastTime(2).toISOString(),
    });

    const fire2Time = getRandomPastTime(4);
    sampleData.push({
      id: 'fire_trecemartires_002',
      type: 'fire',
      timestamp: fire2Time.toISOString(),
      location: {
        ...baseLocation,
        latitude: baseLocation.latitude - 0.015,
        longitude: baseLocation.longitude + 0.01,
        barangay: 'San Agustin',
        place_name: 'Industrial Zone, San Agustin',
      },
      status: 'confirmed',
      severity: 'critical',
      metadata: {
        fire_type: 'industrial',
        fire_intensity: 'critical',
        affected_structures: 1,
        casualties: 1,
        injuries: 5,
        verified: true,
        reporter_id: 'user_002',
        fire_stations_responded: ['Trece Martires Fire Station', 'General Trias Fire Station'],
        estimated_damage: '₱2,000,000',
      },
      sources: ['user_report'],
      description: 'Industrial warehouse fire with casualties',
      createdAt: fire2Time.toISOString(),
      updatedAt: fire2Time.toISOString(),
    });

    // Sample Earthquake
    const eqTime = getRandomPastTime(5);
    sampleData.push({
      id: 'eq_trecemartires_001',
      type: 'earthquake',
      timestamp: eqTime.toISOString(),
      location: {
        ...baseLocation,
        latitude: baseLocation.latitude + 0.02,
        longitude: baseLocation.longitude - 0.03,
        place_name: '15 km NE of Trece Martires',
      },
      status: 'confirmed',
      severity: 'medium',
      metadata: {
        magnitude: 4.2,
        depth_km: 10,
        epicenter_name: 'Near Trece Martires, Cavite',
        tsunami_risk: false,
      },
      sources: ['phivolcs'],
      description: 'Magnitude 4.2 earthquake felt in Cavite area',
      createdAt: eqTime.toISOString(),
      updatedAt: eqTime.toISOString(),
    });

    // Sample Floods
    const flood1Time = getRandomPastTime(3);
    sampleData.push({
      id: 'flood_trecemartires_001',
      type: 'flood',
      timestamp: flood1Time.toISOString(),
      location: {
        ...baseLocation,
        latitude: baseLocation.latitude - 0.008,
        longitude: baseLocation.longitude + 0.012,
        barangay: 'Luciano',
        place_name: 'Luciano Area',
      },
      status: 'confirmed',
      severity: 'medium',
      metadata: {
        hazard_level: 'medium',
        rainfall_last_24h_mm: 85,
        affected_barangay: 'Luciano',
        affected_municipality: 'Trece Martires',
        affected_province: 'Cavite',
        affected_region: 'CALABARZON',
        flood_risk_level: 'moderate',
        evacuation_recommended: false,
        affected_population_estimate: 150,
        data_source: 'local_report',
      },
      sources: ['weather_service', 'user_report'],
      description: 'Flooding in low-lying areas of Barangay Luciano',
      createdAt: flood1Time.toISOString(),
      updatedAt: flood1Time.toISOString(),
    });

    const flood2Time = getRandomPastTime(4);
    sampleData.push({
      id: 'flood_trecemartires_002',
      type: 'flood',
      timestamp: flood2Time.toISOString(),
      location: {
        ...baseLocation,
        latitude: baseLocation.latitude + 0.012,
        longitude: baseLocation.longitude - 0.008,
        barangay: 'De Ocampo',
        place_name: 'De Ocampo Subdivision',
      },
      status: 'confirmed',
      severity: 'low',
      metadata: {
        hazard_level: 'low',
        rainfall_last_24h_mm: 55,
        affected_barangay: 'De Ocampo',
        affected_municipality: 'Trece Martires',
        affected_province: 'Cavite',
        affected_region: 'CALABARZON',
        flood_risk_level: 'low',
        evacuation_recommended: false,
        affected_population_estimate: 50,
        data_source: 'local_report',
      },
      sources: ['user_report'],
      description: 'Minor street flooding in De Ocampo area',
      createdAt: flood2Time.toISOString(),
      updatedAt: flood2Time.toISOString(),
    });

    // Sample Accidents
    const acc1Time = getRandomPastTime(1);
    sampleData.push({
      id: 'accident_trecemartires_001',
      type: 'accident',
      timestamp: acc1Time.toISOString(),
      location: {
        ...baseLocation,
        latitude: baseLocation.latitude,
        longitude: baseLocation.longitude + 0.003,
        place_name: 'Gov. Ferrer Avenue',
      },
      status: 'confirmed',
      severity: 'medium',
      metadata: {
        incident_type: 'road_accident',
        severity: 'moderate',
        verified: true,
        reporter_id: 'user_003',
      },
      sources: ['user_report'],
      description: 'Vehicle collision on Gov. Ferrer Avenue, traffic slow',
      createdAt: acc1Time.toISOString(),
      updatedAt: acc1Time.toISOString(),
    });

    const acc2Time = getRandomPastTime(2);
    sampleData.push({
      id: 'accident_trecemartires_002',
      type: 'accident',
      timestamp: acc2Time.toISOString(),
      location: {
        ...baseLocation,
        latitude: baseLocation.latitude - 0.005,
        longitude: baseLocation.longitude - 0.004,
        place_name: 'Trece-Indang Road',
      },
      status: 'confirmed',
      severity: 'high',
      metadata: {
        incident_type: 'road_accident',
        severity: 'major',
        verified: true,
        reporter_id: 'user_004',
      },
      sources: ['user_report'],
      description: 'Major accident on Trece-Indang Road, road partially blocked',
      createdAt: acc2Time.toISOString(),
      updatedAt: acc2Time.toISOString(),
    });

    // Filter to ensure all sample data is within last 7 days
    return sampleData.filter(item => {
      const itemDate = new Date(item.timestamp);
      return itemDate >= sevenDaysAgo;
    });
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    const now = Date.now();
    const cacheAge = this.cache.lastUpdate ? 
      Math.floor((now - this.cache.lastUpdate) / 1000) : null;

    return {
      totalHazards: this.cache.hazards.length,
      lastUpdate: this.cache.lastUpdate ? new Date(this.cache.lastUpdate).toISOString() : null,
      cacheAgeSeconds: cacheAge,
      isUpdating: this.isUpdating,
      byType: this.getHazardsByType(),
      bySeverity: this.getHazardsBySeverity(),
    };
  }

  /**
   * Get hazards grouped by type
   */
  getHazardsByType() {
    return this.cache.hazards.reduce((acc, h) => {
      acc[h.type] = (acc[h.type] || 0) + 1;
      return acc;
    }, {});
  }

  /**
   * Get hazards grouped by severity
   */
  getHazardsBySeverity() {
    return this.cache.hazards.reduce((acc, h) => {
      acc[h.severity] = (acc[h.severity] || 0) + 1;
      return acc;
    }, {});
  }
}

module.exports = new DataAggregator();
