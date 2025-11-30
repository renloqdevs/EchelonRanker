/**
 * Logger Utility for Discord Bot
 */

const config = require('../config');

const LOG_LEVELS = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

class Logger {
    constructor() {
        this.level = LOG_LEVELS[config.options.logLevel] ?? LOG_LEVELS.info;
    }

    timestamp() {
        return new Date().toISOString();
    }

    error(message, ...args) {
        if (this.level >= LOG_LEVELS.error) {
            console.error(`[${this.timestamp()}] [ERROR]`, message, ...args);
        }
    }

    warn(message, ...args) {
        if (this.level >= LOG_LEVELS.warn) {
            console.warn(`[${this.timestamp()}] [WARN]`, message, ...args);
        }
    }

    info(message, ...args) {
        if (this.level >= LOG_LEVELS.info) {
            console.log(`[${this.timestamp()}] [INFO]`, message, ...args);
        }
    }

    debug(message, ...args) {
        if (this.level >= LOG_LEVELS.debug) {
            console.log(`[${this.timestamp()}] [DEBUG]`, message, ...args);
        }
    }

    command(interaction, status = 'executed') {
        const user = interaction.user.tag;
        const command = interaction.commandName;
        const guild = interaction.guild?.name || 'DM';
        
        this.info(`[CMD] /${command} by ${user} in ${guild} - ${status}`);
    }
}

module.exports = new Logger();
