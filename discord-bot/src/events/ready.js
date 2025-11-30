/**
 * Ready Event
 * Triggered when the bot successfully connects to Discord
 */

const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const api = require('../api/rankbot');

module.exports = {
    name: 'ready',
    once: true,

    async execute(client) {
        logger.info(`Logged in as ${client.user.tag}`);
        logger.info(`Serving ${client.guilds.cache.size} guild(s)`);

        // Set bot activity
        client.user.setActivity('Roblox Ranks', { type: ActivityType.Watching });

        // Test API connection
        try {
            const health = await api.health();
            if (health.status === 'ok') {
                logger.info('Connected to RankBot API');
                if (health.botConnected) {
                    logger.info('Roblox bot is online');
                } else {
                    logger.warn('Roblox bot is not connected');
                }
            }
        } catch (error) {
            logger.error('Failed to connect to RankBot API:', error.message);
            logger.warn('Commands will fail until API is available');
        }

        logger.info('Bot is ready!');
    }
};
