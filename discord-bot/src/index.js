/**
 * RankBot Discord Bot
 * Main entry point
 * 
 * A Discord bot for managing Roblox group ranks through the RankBot API
 */

const { Client, GatewayIntentBits, Collection } = require('discord.js');
const config = require('./config');
const { loadCommands } = require('./handlers/commands');
const { loadEvents } = require('./handlers/events');
const logger = require('./utils/logger');

// Create Discord client
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds
    ]
});

// Initialize commands collection
client.commands = new Collection();

// Load commands and events
loadCommands(client);
loadEvents(client);

// Error handling
client.on('error', error => {
    logger.error('Discord client error:', error.message);
});

process.on('unhandledRejection', error => {
    logger.error('Unhandled promise rejection:', error.message);
});

process.on('uncaughtException', error => {
    logger.error('Uncaught exception:', error.message);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Shutting down...');
    client.destroy();
    process.exit(0);
});

process.on('SIGTERM', () => {
    logger.info('Shutting down...');
    client.destroy();
    process.exit(0);
});

// Login
logger.info('Starting RankBot Discord...');
client.login(config.discord.token);
