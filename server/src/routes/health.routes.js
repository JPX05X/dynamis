const express = require('express');
const router = express.Router();
const healthController = require('../controllers/health.controller');

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: Health check and monitoring endpoints
 */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Check system health
 *     description: Returns the health status of the application and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Application is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "up"
 *                 message:
 *                   type: string
 *                   example: "Service is healthy"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                 uptime:
 *                   type: number
 *                   example: 123.45
 *                 database:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                       example: "up"
 *                     connectionState:
 *                       type: number
 *                       example: 1
 *                     stats:
 *                       type: object
 *                       properties:
 *                         connections:
 *                           type: number
 *                           example: 5
 *                         disconnects:
 *                           type: number
 *                           example: 1
 *                         queries:
 *                           type: number
 *                           example: 42
 *                         slowQueries:
 *                           type: number
 *                           example: 2
 *                         errors:
 *                           type: number
 *                           example: 0
 *       503:
 *         description: Service is unhealthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "down"
 *                 message:
 *                   type: string
 *                   example: "Database connection failed"
 */
router.get('/', healthController.getHealth);

/**
 * @swagger
 * /health/stats:
 *   get:
 *     summary: Get database statistics
 *     description: Returns statistics about the database connection and queries
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Database statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: object
 *                   properties:
 *                     connections:
 *                       type: number
 *                       example: 5
 *                     disconnects:
 *                       type: number
 *                       example: 1
 *                     errors:
 *                       type: number
 *                       example: 0
 *                     queries:
 *                       type: number
 *                       example: 42
 *                     slowQueries:
 *                       type: number
 *                       example: 2
 *                     isConnected:
 *                       type: boolean
 *                       example: true
 *                     connectionState:
 *                       type: number
 *                       example: 1
 *                     connectionRetries:
 *                       type: number
 *                       example: 0
 */
router.get('/stats', healthController.getDatabaseStats);

module.exports = router;
