const { checkHealth, getStats } = require('../utils/db');
const logger = require('../utils/logger');

/**
 * Get database health status
 * @route GET /health
 * @returns {Object} Health status and database statistics
 */
const getHealth = async (req, res, next) => {
  try {
    const health = await checkHealth();
    const status = health.status === 'up' ? 200 : 503;
    
    res.status(status).json({
      status: health.status,
      message: health.message,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: health.status,
        connectionState: health.stats?.connectionState,
        stats: {
          connections: health.stats?.connections,
          disconnects: health.stats?.disconnects,
          queries: health.stats?.queries,
          slowQueries: health.stats?.slowQueries,
          errors: health.stats?.errors
        },
        dbStats: health.stats?.dbStats
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    next(error);
  }
};

/**
 * Get database statistics
 * @route GET /health/stats
 * @returns {Object} Database statistics
 */
const getDatabaseStats = async (req, res, next) => {
  try {
    const stats = getStats();
    res.json({
      status: 'success',
      data: stats
    });
  } catch (error) {
    logger.error('Failed to get database stats:', error);
    next(error);
  }
};

module.exports = {
  getHealth,
  getDatabaseStats
};
