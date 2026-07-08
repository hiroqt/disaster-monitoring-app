const axios = require('axios');

/**
 * USGS Earthquake API Service
 * Fetches real-time earthquake data from USGS
 */
class USGSService {
  constructor() {
    this.baseUrl = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary';
    // Philippines bounding box
    this.bounds = {
      minLat: 4.0,
      maxLat: 21.0,
      minLon: 116.0,
      maxLon: 127.0
    };
  }

  /**
   * Fetch earthquakes from the last 7 days (Trece Martires area only)
   */
  async getRecentEarthquakes() {
    try {
      // Trece Martires coordinates: 14.2832° N, 120.8660° E
      // Filter area: ~50km radius around Trece Martires
      const centerLat = 14.2832;
      const centerLon = 120.8660;
      const radiusKm = 50;

      // Get all earthquakes from past 7 days
      const response = await axios.get(`${this.baseUrl}/all_week.geojson`, {
        timeout: 10000
      });

      const earthquakes = response.data.features
        .filter(feature => {
          const [lon, lat] = feature.geometry.coordinates;
          // Calculate distance from Trece Martires
          const distance = this.calculateDistance(centerLat, centerLon, lat, lon);
          return distance <= radiusKm;
        })
        .map(feature => this.normalizeEarthquake(feature));

      return earthquakes;
    } catch (error) {
      console.error('USGS API Error:', error.message);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula) in km
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
   * Check if coordinates are within Philippines bounds
   */
  isInPhilippines(coordinates) {
    const [lon, lat] = coordinates;
    return (
      lat >= this.bounds.minLat &&
      lat <= this.bounds.maxLat &&
      lon >= this.bounds.minLon &&
      lon <= this.bounds.maxLon
    );
  }

  /**
   * Normalize USGS earthquake data to our schema
   */
  normalizeEarthquake(feature) {
    const [lon, lat, depth] = feature.geometry.coordinates;
    const magnitude = feature.properties.mag;
    const timestamp = new Date(feature.properties.time).toISOString();

    return {
      id: `usgs_${feature.id}`,
      type: 'earthquake',
      timestamp,
      location: { latitude: lat, longitude: lon },
      status: 'confirmed',
      severity: this.calculateSeverity(magnitude),
      metadata: {
        magnitude,
        depth_km: depth,
        epicenter_name: feature.properties.place,
        tsunami_risk: feature.properties.tsunami === 1,
        felt_reports: feature.properties.felt || 0,
        cdi: feature.properties.cdi, // Community Decimal Intensity
        alert: feature.properties.alert, // green, yellow, orange, red
        url: feature.properties.url
      },
      sources: ['USGS'],
      description: `Magnitude ${magnitude} earthquake - ${feature.properties.place}`,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  /**
   * Calculate severity based on magnitude
   */
  calculateSeverity(magnitude) {
    if (magnitude >= 7.0) return 'critical';
    if (magnitude >= 6.0) return 'high';
    if (magnitude >= 4.5) return 'medium';
    return 'low';
  }
}

module.exports = new USGSService();
