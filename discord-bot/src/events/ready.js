/**
 * Ready Event
 * Triggered when the bot successfully connects to Discord
 * 
 * Features:
 * - API health check on startup
 * - Periodic health monitoring
 * - Dynamic bot status based on API health
 */

const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const api = require('../api/rankbot');

// Health check interval (30 seconds)
const HEALTH_CHECK_INTERVAL = 30 * 1000;

// Track health check interval
let healthCheckInterval = null;

module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {
        logger.info(`Logged in as ${client.user.tag}`);
        logger.info(`Serving ${client.guilds.cache.size} guild(s)`);

        // Initial status
        updateStatus(client, 'starting');

        // Run initial health check
        const isHealthy = await checkHealth(client);
        
        if (isHealthy) {
            logger.info('Bot is ready!');
        } else {
            logger.warn('Bot is ready but API is not available');
        }

        // Start periodic health checks
        startHealthMonitoring(client);

        // Pre-cache roles for autocomplete
        try {
            await api.getRoles();
            logger.info('Roles cached for autocomplete');
        } catch (error) {
            logger.debug('Failed to pre-cache roles:', error.message);
        }
    }
};

/**
 * Check API health and update bot status
 */
async function checkHealth(client) {
    try {
        const health = await api.health(true); // Force refresh
        
        if (health.status === 'ok') {
            updateStatus(client, 'online', health.botConnected);
            
            if (!health.botConnected) {
                logger.warn('API is healthy but Roblox bot is not connected');
            }
            
            return true;
        } else {
            updateStatus(client, 'degraded');
            return false;
        }

    } catch (error) {
        logger.debug('Health check failed:', error.message);
        updateStatus(client, 'offline');
        return false;
    }
}

/**
 * Update bot status based on health
 */
function updateStatus(client, state, botConnected = true) {
    const statuses = {
        starting: {
            activity: { name: 'Starting up...', type: ActivityType.Playing },
            status: 'idle'
        },
        online: {
            activity: { 
                name: botConnected ? 'your hierarchy | Echelon' : 'API Online (Bot Disconnected)', 
                type: ActivityType.Watching 
            },
            status: botConnected ? 'online' : 'idle'
        },
        degraded: {
            activity: { name: 'API Issues', type: ActivityType.Playing },
            status: 'idle'
        },
        offline: {
            activity: { name: 'API Offline', type: ActivityType.Playing },
            status: 'dnd'
        }
    };

    const config = statuses[state] || statuses.offline;
    
    client.user.setPresence({
        activities: [config.activity],
        status: config.status
    });
}

/**
 * Start periodic health monitoring
 */
function startHealthMonitoring(client) {
    // Clear existing interval if any
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
    }

    healthCheckInterval = setInterval(async () => {
        await checkHealth(client);
    }, HEALTH_CHECK_INTERVAL);

    logger.debug('Health monitoring started');
}

/**
 * Stop health monitoring (for graceful shutdown)
 */
function stopHealthMonitoring() {
    if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
        healthCheckInterval = null;
    }
}

// Export for potential external use
module.exports.stopHealthMonitoring = stopHealthMonitoring;
