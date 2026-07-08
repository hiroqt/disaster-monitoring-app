const axios = require('axios');
const xml2js = require('xml2js');

/**
 * GDACS (Global Disaster Alert and Coordination System) Service
 * Fetches real-time disaster data including typhoons, floods, earthquakes
 */
class GDACSService {
  constructor() {
    this.baseUrl = 'https://www.gdacs.org/gdacsapi/api';
    this.bounds = {
      minLat: 4.0,
      maxLat: 21.0,
      minLon: 116.0,
      maxLon: 127.0
    };
  }

  /**
   * Fetch recent disasters from GDACS (typhoons only - last 7 days)
   */
  async getRecentDisasters() {
    try {
      // Try JSON API first (newer endpoint)
      const response = await axios.get(`${this.baseUrl}/events/geteventlist/SEARCH`, {
        params: {
          fromdate: this.getDateDaysAgo(7),
          todate: new Date().toISOString().split('T')[0],
          alertlevel: 'Green;Orange;Red',
        },
        headers: {
          'Accept': 'application/json'
        },
        timeout: 15000
      });

      // Check if response is JSON
      if (typeof response.data === 'object' && !response.data.startsWith) {
        return this.parseJSONResponse(response.data);
      }

      // Fall back to XML parsing
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(response.data);

      if (!result.rss || !result.rss.channel || !result.rss.channel.item) {
        return [];
      }

      const items = Array.isArray(result.rss.channel.item) 
        ? result.rss.channel.item 
        : [result.rss.channel.item];

      const disasters = items
        .filter(item => {
          // Only include typhoons (they affect wider regions)
          const eventType = item['gdacs:eventtype']?.toLowerCase() || 'unknown';
          return eventType === 'tc' && this.isInPhilippines(item);
        })
        .map(item => this.normalizeDisaster(item));

      return disasters;
    } catch (error) {
      console.error('GDACS API Error:', error.message);
      return [];
    }
  }

  /**
   * Parse JSON response from GDACS (typhoons only)
   */
  parseJSONResponse(data) {
    if (!data.features || !Array.isArray(data.features)) {
      return [];
    }

    const disasters = data.features
      .filter(feature => {
        // Only include typhoons
        const eventType = feature.properties?.eventtype?.toLowerCase() || 'unknown';
        return eventType === 'tc' && this.isInPhilippinesGeoJSON(feature);
      })
      .map(feature => this.normalizeGeoJSONDisaster(feature));

    return disasters;
  }

  /**
   * Check if GeoJSON feature is in Philippines
   */
  isInPhilippinesGeoJSON(feature) {
    if (!feature.geometry || !feature.geometry.coordinates) {
      return false;
    }
    const [lon, lat] = feature.geometry.coordinates;
    return (
      lat >= this.bounds.minLat &&
      lat <= this.bounds.maxLat &&
      lon >= this.bounds.minLon &&
      lon <= this.bounds.maxLon
    );
  }

  /**
   * Normalize GeoJSON disaster data
   */
  normalizeGeoJSONDisaster(feature) {
    const [lon, lat] = feature.geometry.coordinates;
    const props = feature.properties;
    const eventType = props.eventtype?.toLowerCase() || 'unknown';
    const alertLevel = props.alertlevel || 'Green';
    const timestamp = new Date(props.fromdate || props.todate).toISOString();

    const type = this.mapEventType(eventType);
    const severity = this.mapAlertLevel(alertLevel);

    return {
      id: `gdacs_${props.eventid || feature.id}`,
      type,
      timestamp,
      location: { latitude: lat, longitude: lon },
      status: 'confirmed',
      severity,
      metadata: {
        alert_level: alertLevel,
        event_id: props.eventid,
        country: props.country,
        population_affected: props.population || 0,
        magnitude: props.magnitude,
        severity_value: props.severity,
      },
      sources: ['GDACS'],
      description: props.htmldescription || props.description || 'GDACS disaster alert',
      createdAt: timestamp,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Get date N days ago in YYYY-MM-DD format
   */
  getDateDaysAgo(days) {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  }

  /**
   * Check if disaster is in Philippines
   */
  isInPhilippines(item) {
    if (!item['geo:Point'] || !item['geo:Point']['geo:lat'] || !item['geo:Point']['geo:long']) {
      return false;
    }
    const lat = parseFloat(item['geo:Point']['geo:lat']);
    const lon = parseFloat(item['geo:Point']['geo:long']);
    return (
      lat >= this.bounds.minLat &&
      lat <= this.bounds.maxLat &&
      lon >= this.bounds.minLon &&
      lon <= this.bounds.maxLon
    );
  }

  /**
   * Normalize GDACS disaster data to our schema
   */
  normalizeDisaster(item) {
    const lat = parseFloat(item['geo:Point']['geo:lat']);
    const lon = parseFloat(item['geo:Point']['geo:long']);
    const eventType = item['gdacs:eventtype']?.toLowerCase() || 'unknown';
    const alertLevel = item['gdacs:alertlevel'] || 'Green';
    const timestamp = new Date(item.pubDate || item['gdacs:fromdate']).toISOString();

    const type = this.mapEventType(eventType);
    const severity = this.mapAlertLevel(alertLevel);

    return {
      id: `gdacs_${item['gdacs:eventid'] || item.guid}`,
      type,
      timestamp,
      location: { latitude: lat, longitude: lon },
      status: 'confirmed',
      severity,
      metadata: this.buildMetadata(item, eventType),
      sources: ['GDACS'],
      description: item.description || item.title || 'GDACS disaster alert',
      createdAt: timestamp,
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Map GDACS event type to our hazard type
   */
  mapEventType(eventType) {
    const mapping = {
      'eq': 'earthquake',
      'tc': 'typhoon',
      'fl': 'flood',
      'ts': 'tsunami',
      'vo': 'volcano',
      'dr': 'flood', // drought mapped to flood category
    };
    return mapping[eventType] || 'accident';
  }

  /**
   * Map GDACS alert level to severity
   */
  mapAlertLevel(alertLevel) {
    const mapping = {
      'Red': 'critical',
      'Orange': 'high',
      'Green': 'medium'
    };
    return mapping[alertLevel] || 'low';
  }

  /**
   * Build type-specific metadata
   */
  buildMetadata(item, eventType) {
    const metadata = {
      alert_level: item['gdacs:alertlevel'],
      event_id: item['gdacs:eventid'],
      country: item['gdacs:country'],
      population_affected: item['gdacs:population'] ? 
        parseInt(item['gdacs:population']['_']) : 0,
    };

    // Add type-specific fields
    if (eventType === 'eq') {
      metadata.magnitude = item['gdacs:magnitude'] ? 
        parseFloat(item['gdacs:magnitude']['_']) : null;
      metadata.depth_km = item['gdacs:depth'] ? 
        parseFloat(item['gdacs:depth']) : null;
    } else if (eventType === 'tc') {
      metadata.wind_speed_kph = item['gdacs:severity'] ? 
        parseFloat(item['gdacs:severity']['_']) : null;
    }

    return metadata;
  }
}

module.exports = new GDACSService();
