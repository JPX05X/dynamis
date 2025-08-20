import express from 'express';
import healthController from '../controllers/health.controller.js';

const router = express.Router();

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
 *                   example: "ok"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-05-15T12:00:00.000Z"
 *                 uptime:
 *                   type: number
 *                   description: Uptime in seconds
 *                   example: 123.45
 *       503:
 *         description: Service unavailable
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "error"
 *                 error:
 *                   type: string
 *                   example: "Database connection failed"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-05-15T12:00:00.000Z"
 */
router.get('/', healthController.checkHealth);

/**
 * @swagger
 * /health/version:
 *   get:
 *     summary: Get application version
 *     description: Returns the current version of the application
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Version information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 name:
 *                   type: string
 *                   example: "dynamis-messaging-service"
 *                 version:
 *                   type: string
 *                   example: "1.0.0"
 *                 environment:
 *                   type: string
 *                   example: "development"
 *                 nodeVersion:
 *                   type: string
 *                   example: "v14.17.0"
 */
router.get('/version', healthController.getVersion);

/**
 * @swagger
 * /health/status:
 *   get:
 *     summary: Get detailed system status
 *     description: Returns detailed status information about the application and its dependencies
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed system status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "ok"
 *                 services:
 *                   type: object
 *                   properties:
 *                     database:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "connected"
 *                         responseTime:
 *                           type: number
 *                           example: 12.34
 *                     cache:
 *                       type: object
 *                       properties:
 *                         status:
 *                           type: string
 *                           example: "connected"
 *                         responseTime:
 *                           type: number
 *                           example: 1.23
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2023-05-15T12:00:00.000Z"
 */
router.get('/status', healthController.getStatus);

export default router;
