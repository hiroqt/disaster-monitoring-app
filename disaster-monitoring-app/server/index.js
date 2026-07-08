const express = require('express');
const cors = require('cors');
const dataAggregator = require('./services/data-aggregator');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Simple in-memory storage
let userReports = [];
let notificationPreferences = {};
const killSwitches = {
  global: false,
  alerts: {}
};

// Rate limiting storage (simple in-memory for demo)
const rateLimits = new Map();

// Simple rate limiter middleware
const rateLimit = (limit, windowMs) => (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, []);
  }
  
  const requests = rateLimits.get(ip).filter(time => now - time < windowMs);
  
  if (requests.length >= limit) {
    return res.status(429).json({
      error: 'Too many requests',
      message: `Rate limit exceeded. Try again in ${Math.ceil((windowMs - (now - requests[0])) / 1000)} seconds.`,
      retryAfter: Math.ceil((windowMs - (now - requests[0])) / 1000)
    });
  }
  
  requests.push(now);
  rateLimits.set(ip, requests);
  next();
};

// Validation helpers
const isValidHazardType = (type) => {
  return ['earthquake', 'typhoon', 'flood', 'fire', 'accident'].includes(type);
};

const isValidSeverity = (severity) => {
  return ['low', 'medium', 'high', 'critical'].includes(severity);
};

const isValidCoordinates = (lat, lon) => {
  return lat >= 4.0 && lat <= 21.0 && lon >= 116.0 && lon <= 127.0;
};

// API Routes

// Initialize data on startup
dataAggregator.updateCache();

// Auto-refresh data every 5 minutes
setInterval(() => {
  dataAggregator.updateCache();
}, 5 * 60 * 1000);

// ============= Hazard Endpoints =============

// GET /api/v1/hazards - List all hazards with filtering
app.get('/api/v1/hazards', rateLimit(100, 60000), async (req, res) => {
  try {
    const { type, region, since, severity, limit = 100, offset = 0 } = req.query;
    
    // Get all hazards from aggregator
    const allHazards = await dataAggregator.getAllHazards();
    
    // Apply filters
    const filters = { type, region, since, severity };
    let filtered = dataAggregator.filterHazards(filters);
    
    // Validate type filter
    if (type && !isValidHazardType(type)) {
      return res.status(400).json({
        error: 'Invalid hazard type',
        message: 'Type must be one of: earthquake, typhoon, flood, fire, accident'
      });
    }
    
    // Validate severity filter
    if (severity && !isValidSeverity(severity)) {
      return res.status(400).json({
        error: 'Invalid severity',
        message: 'Severity must be one of: low, medium, high, critical'
      });
    }
    
    // Pagination
    const total = filtered.length;
    const limitNum = Math.min(parseInt(limit) || 100, 500);
    const offsetNum = parseInt(offset) || 0;
    const paginated = filtered.slice(offsetNum, offsetNum + limitNum);
    
    // Set cache headers
    res.set({
      'Cache-Control': 'public, max-age=30',
      'ETag': `"${Date.now()}"`,
    });
    
    res.json({
      data: paginated,
      pagination: {
        total,
        limit: limitNum,
        offset: offsetNum,
        hasMore: offsetNum + limitNum < total
      },
      metadata: {
        timestamp: new Date().toISOString(),
        count: paginated.length,
        cacheStats: dataAggregator.getCacheStats()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/hazards/:id - Get specific hazard
app.get('/api/v1/hazards/:id', rateLimit(100, 60000), async (req, res) => {
  try {
    const hazard = dataAggregator.getHazardById(req.params.id);
    
    if (!hazard) {
      return res.status(404).json({
        error: 'Hazard not found',
        message: `No hazard found with id: ${req.params.id}`
      });
    }
    
    res.set('Cache-Control', 'public, max-age=30');
    res.json({
      data: hazard,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/regions/:regionId/active-hazards - Get hazards by region
app.get('/api/v1/regions/:regionId/active-hazards', rateLimit(100, 60000), async (req, res) => {
  try {
    const { regionId } = req.params;
    const { since } = req.query;
    
    // Get all hazards
    const allHazards = await dataAggregator.getAllHazards();
    
    // Filter by region and recency
    const filters = { region: regionId };
    if (since) {
      filters.since = since;
    } else {
      // Default to last 48 hours
      const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
      filters.since = fortyEightHoursAgo.toISOString();
    }
    
    const filtered = dataAggregator.filterHazards(filters);
    
    res.set('Cache-Control', 'public, max-age=60');
    res.json({
      data: filtered,
      metadata: {
        regionId,
        timestamp: new Date().toISOString(),
        count: filtered.length
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============= User Report Endpoints =============

// POST /api/v1/reports - Submit a user report
app.post('/api/v1/reports', rateLimit(10, 3600000), (req, res) => {
  try {
    const { type, location, description, photoUrl } = req.body;
    
    // Validation
    if (!type || !location) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'type and location are required'
      });
    }
    
    if (!isValidHazardType(type)) {
      return res.status(400).json({
        error: 'Invalid hazard type',
        message: 'Type must be one of: earthquake, typhoon, flood, fire, accident'
      });
    }
    
    if (!location.latitude || !location.longitude) {
      return res.status(400).json({
        error: 'Invalid location',
        message: 'Location must include latitude and longitude'
      });
    }
    
    if (!isValidCoordinates(location.latitude, location.longitude)) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Coordinates must be within Philippines bounds'
      });
    }
    
    const report = {
      id: `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      reporterId: req.headers['x-device-id'] || 'anonymous',
      type,
      location,
      description: description || '',
      photoUrl: photoUrl || null,
      status: 'pending',
      submittedAt: new Date().toISOString(),
    };
    
    userReports.push(report);
    
    res.status(201).json({
      data: report,
      metadata: {
        message: 'Report submitted successfully',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/reports - Get user reports (filtered by reporter)
app.get('/api/v1/reports', rateLimit(100, 60000), (req, res) => {
  try {
    const reporterId = req.headers['x-device-id'];
    
    if (!reporterId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'x-device-id header required'
      });
    }
    
    const filtered = userReports.filter(r => r.reporterId === reporterId);
    
    res.json({
      data: filtered,
      metadata: {
        timestamp: new Date().toISOString(),
        count: filtered.length
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// DELETE /api/v1/reports/:reportId - Delete a user report
app.delete('/api/v1/reports/:reportId', rateLimit(20, 60000), (req, res) => {
  try {
    const reporterId = req.headers['x-device-id'];
    
    if (!reporterId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'x-device-id header required'
      });
    }
    
    const index = userReports.findIndex(
      r => r.id === req.params.reportId && r.reporterId === reporterId
    );
    
    if (index === -1) {
      return res.status(404).json({
        error: 'Report not found',
        message: 'Report not found or you do not have permission to delete it'
      });
    }
    
    userReports.splice(index, 1);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============= Notification Preferences =============

// POST /api/v1/preferences/notifications - Update notification preferences
app.post('/api/v1/preferences/notifications', rateLimit(20, 60000), (req, res) => {
  try {
    const deviceId = req.headers['x-device-id'];
    
    if (!deviceId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'x-device-id header required'
      });
    }
    
    const { topics, regions, severityThreshold } = req.body;
    
    notificationPreferences[deviceId] = {
      topics: topics || [],
      regions: regions || [],
      severityThreshold: severityThreshold || 'low',
      updatedAt: new Date().toISOString()
    };
    
    res.json({
      data: notificationPreferences[deviceId],
      metadata: {
        message: 'Notification preferences updated successfully',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /api/v1/preferences/notifications - Get notification preferences
app.get('/api/v1/preferences/notifications', rateLimit(100, 60000), (req, res) => {
  try {
    const deviceId = req.headers['x-device-id'];
    
    if (!deviceId) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'x-device-id header required'
      });
    }
    
    const prefs = notificationPreferences[deviceId] || {
      topics: [],
      regions: [],
      severityThreshold: 'low'
    };
    
    res.json({
      data: prefs,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============= System Health =============

// GET /api/v1/health - System health check
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'operational',
    timestamp: new Date().toISOString(),
    services: {
      usgs: 'ok',
      gdacs: 'ok',
      open_meteo: 'ok',
      phivolcs: 'ok',
      mmda: 'degraded',
      pagasa: 'ok'
    },
    statistics: {
      totalHazards: mockHazards.length,
      userReports: userReports.length,
      activeUsers: Object.keys(notificationPreferences).length
    }
  });
});

// GET /api/v1/statistics - API statistics
app.get('/api/v1/statistics', rateLimit(100, 60000), async (req, res) => {
  try {
    const now = Date.now();
    const last24Hours = now - 24 * 60 * 60 * 1000;
    
    const allHazards = await dataAggregator.getAllHazards();
    const recentHazards = allHazards.filter(
      h => new Date(h.timestamp).getTime() >= last24Hours
    );
    
    const hazardsByType = recentHazards.reduce((acc, h) => {
      acc[h.type] = (acc[h.type] || 0) + 1;
      return acc;
    }, {});
    
    const hazardsBySeverity = recentHazards.reduce((acc, h) => {
      acc[h.severity] = (acc[h.severity] || 0) + 1;
      return acc;
    }, {});
    
    res.json({
      data: {
        last24Hours: {
          total: recentHazards.length,
          byType: hazardsByType,
          bySeverity: hazardsBySeverity
        },
        allTime: {
          total: allHazards.length,
          userReports: userReports.length
        },
        sources: {
          usgs: allHazards.filter(h => h.sources.includes('USGS')).length,
          gdacs: allHazards.filter(h => h.sources.includes('GDACS')).length,
          openMeteo: allHazards.filter(h => h.sources.includes('Open-Meteo')).length,
        }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        cacheStats: dataAggregator.getCacheStats()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============= Admin Endpoints (Mock) =============

// POST /admin/v1/kill-switch - Enable/disable kill switch
app.post('/admin/v1/kill-switch', rateLimit(20, 60000), (req, res) => {
  try {
    // In production, verify admin JWT token
    const { global, alertId } = req.body;
    
    if (global !== undefined) {
      killSwitches.global = Boolean(global);
    }
    
    if (alertId) {
      killSwitches.alerts[alertId] = true;
    }
    
    res.json({
      data: killSwitches,
      metadata: {
        message: 'Kill switch updated',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// GET /admin/v1/kill-switch - Get kill switch status
app.get('/admin/v1/kill-switch', rateLimit(100, 60000), (req, res) => {
  try {
    res.json({
      data: killSwitches,
      metadata: {
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// ============= Error Handling =============

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Endpoint ${req.method} ${req.path} not found`,
    availableEndpoints: [
      'GET /api/v1/hazards',
      'GET /api/v1/hazards/:id',
      'GET /api/v1/regions/:regionId/active-hazards',
      'POST /api/v1/reports',
      'GET /api/v1/reports',
      'DELETE /api/v1/reports/:reportId',
      'POST /api/v1/preferences/notifications',
      'GET /api/v1/preferences/notifications',
      'GET /api/v1/health',
      'GET /api/v1/statistics'
    ]
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║   🚀 Disaster Monitoring API Server (Real Data)           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`\n📡 Server running on http://localhost:${PORT}`);
  console.log(`\n🌐 Data Sources:`);
  console.log(`   • USGS - Real-time earthquake data`);
  console.log(`   • GDACS - Global disaster alerts`);
  console.log(`   • Open-Meteo - Weather and flood data`);
  console.log(`\n🔗 Available endpoints:`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/hazards`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/hazards/:id`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/regions/:regionId/active-hazards`);
  console.log(`   POST http://localhost:${PORT}/api/v1/reports`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/reports`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/health`);
  console.log(`   GET  http://localhost:${PORT}/api/v1/statistics`);
  console.log(`\n🔄 Auto-refresh: Every 5 minutes`);
  console.log(`✨ Ready to receive requests!\n`);
});
