import { checkHealth as checkDbHealth, getStats as getDbStats } from '../utils/db.js';
import logger from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Check system health
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const checkHealth = async (req, res) => {
  try {
    const health = await checkDbHealth();
    const status = health.status === 'connected' ? 200 : 503;
    
    return res.status(status).json({
      status: health.status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: health.status,
        message: health.message,
        stats: health.stats,
      },
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    return res.status(503).json({
      status: 'error',
      error: 'Service Unavailable',
      message: 'Failed to check system health',
      timestamp: new Date().toISOString(),
    });
  }
};

/**
 * Get application version information
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getVersion = async (req, res) => {
  try {
    const pkg = JSON.parse(
      await fs.readFile(new URL('../../package.json', import.meta.url), 'utf-8')
    );
    
    return res.json({
      name: pkg.name,
      version: pkg.version,
      environment: process.env.NODE_ENV || 'development',
      nodeVersion: process.version,
    });
  } catch (error) {
    logger.error('Failed to get version info', { error: error.message });
    return res.status(500).json({
      status: 'error',
      message: 'Failed to retrieve version information',
    });
  }
};

/**
 * Get detailed system status
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const getStatus = async (req, res) => {
  try {
    const [dbHealth, dbStats] = await Promise.all([
      checkDbHealth(),
      getDbStats(),
    ]);
    
    // Check if all services are healthy
    const allServicesHealthy = dbHealth.status === 'connected';
    
    return res.status(allServicesHealthy ? 200 : 503).json({
      status: allServicesHealthy ? 'ok' : 'degraded',
      services: {
        database: {
          status: dbHealth.status,
          message: dbHealth.message,
          stats: dbStats,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Status check failed', { error: error.message });
    return res.status(503).json({
      status: 'error',
      error: 'Service Unavailable',
      message: 'Failed to check system status',
      timestamp: new Date().toISOString(),
    });
  }
};

export default {
  checkHealth,
  getVersion,
  getStatus,
};
