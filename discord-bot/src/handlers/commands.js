/**
 * Command Handler
 * Loads and registers all slash commands
 */

const fs = require('fs');
const path = require('path');
const { Collection } = require('discord.js');
const logger = require('../utils/logger');

/**
 * Load all commands from the commands directory
 * @param {Client} client - Discord client
 */
function loadCommands(client) {
    client.commands = new Collection();
    
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
            logger.debug(`Loaded command: ${command.data.name}`);
        } else {
            logger.warn(`Command ${file} is missing required "data" or "execute" property`);
        }
    }

    logger.info(`Loaded ${client.commands.size} commands`);
}

/**
 * Get all command data for registration
 * @returns {Array} Array of command data objects
 */
function getCommandData() {
    const commands = [];
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command = require(filePath);

        if ('data' in command) {
            commands.push(command.data.toJSON());
        }
    }

    return commands;
}

module.exports = { loadCommands, getCommandData };
