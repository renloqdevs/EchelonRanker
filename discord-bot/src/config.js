/**
 * Bot Configuration
 * Loads and validates environment variables
 */

require('dotenv').config();

const config = {
    // Discord settings
    discord: {
        token: process.env.DISCORD_TOKEN,
        clientId: process.env.CLIENT_ID,
        guildId: process.env.GUILD_ID || null
    },

    // RankBot API settings
    api: {
        url: process.env.API_URL || 'http://localhost:3000',
        key: process.env.API_KEY
    },

    // Permission settings
    permissions: {
        allowedRoleIds: process.env.ALLOWED_ROLE_IDS 
            ? process.env.ALLOWED_ROLE_IDS.split(',').map(id => id.trim()).filter(Boolean)
            : [],
        adminRoleIds: process.env.ADMIN_ROLE_IDS
            ? process.env.ADMIN_ROLE_IDS.split(',').map(id => id.trim()).filter(Boolean)
            : []
    },

    // Optional settings
    options: {
        logLevel: process.env.LOG_LEVEL || 'info',
        commandCooldown: parseInt(process.env.COMMAND_COOLDOWN) || 3,
        logChannelId: process.env.LOG_CHANNEL_ID || null,
        embedColor: parseInt(process.env.EMBED_COLOR || '5865F2', 16)
    }
};

/**
 * Validate required configuration
 */
function validate() {
    const errors = [];

    if (!config.discord.token) {
        errors.push('DISCORD_TOKEN is required');
    }

    if (!config.discord.clientId) {
        errors.push('CLIENT_ID is required');
    }

    if (!config.api.url) {
        errors.push('API_URL is required');
    }

    if (!config.api.key) {
        errors.push('API_KEY is required');
    }

    if (errors.length > 0) {
        console.error('Configuration errors:');
        errors.forEach(err => console.error(`  - ${err}`));
        console.error('\nPlease check your .env file');
        process.exit(1);
    }
}

// Validate on load
validate();

module.exports = config;
