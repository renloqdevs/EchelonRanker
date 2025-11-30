/**
 * Constants and Configuration
 * Centralized configuration values
 */

// Embed colors
const COLORS = {
    PRIMARY: 0x5865F2,    // Discord blurple
    SUCCESS: 0x57F287,    // Green
    ERROR: 0xED4245,      // Red
    WARNING: 0xFEE75C,    // Yellow
    INFO: 0x5865F2,       // Blue
    PROMOTE: 0x57F287,    // Green
    DEMOTE: 0xED4245,     // Red
    RANK: 0x5865F2        // Blue
};

// Timeouts in milliseconds
const TIMEOUTS = {
    API_REQUEST: 15000,        // 15 seconds
    HEALTH_CHECK: 5000,        // 5 seconds
    BUTTON_COLLECTOR: 60000,   // 1 minute
    UNDO_EXPIRY: 5 * 60 * 1000 // 5 minutes
};

// Cache TTL in milliseconds
const CACHE_TTL = {
    ROLES: 5 * 60 * 1000,      // 5 minutes
    GROUP: 10 * 60 * 1000,     // 10 minutes
    PERMISSIONS: 5 * 60 * 1000, // 5 minutes
    HEALTH: 30 * 1000          // 30 seconds
};

// Rate limiting
const RATE_LIMITS = {
    DEFAULT_COOLDOWN: 3,       // seconds
    BATCH_COOLDOWN: 10,        // seconds
    MAX_BATCH_SIZE: 10
};

// Roblox-related
const ROBLOX = {
    MIN_RANK: 0,
    MAX_RANK: 255,
    MIN_USERNAME_LENGTH: 3,
    MAX_USERNAME_LENGTH: 20,
    MAX_USER_ID: 10000000000,
    USERNAME_REGEX: /^[a-zA-Z0-9_]{3,20}$/,
    AVATAR_URL: (userId) => 
        `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`
};

// Discord-related
const DISCORD = {
    MAX_EMBED_TITLE: 256,
    MAX_EMBED_DESCRIPTION: 4096,
    MAX_EMBED_FIELDS: 25,
    MAX_FIELD_VALUE: 1024,
    MAX_AUTOCOMPLETE_CHOICES: 25
};

// Error codes
const ERROR_CODES = {
    CONNECTION: 'E_CONNECTION',
    TIMEOUT: 'E_TIMEOUT',
    RATE_LIMITED: 'E_RATE_LIMITED',
    UNAUTHORIZED: 'E_UNAUTHORIZED',
    NOT_FOUND: 'E_NOT_FOUND',
    VALIDATION: 'E_VALIDATION',
    NO_UNDO: 'E_NO_UNDO'
};

// Messages
const MESSAGES = {
    ERRORS: {
        CONNECTION: 'Could not connect to the ranking API. Please try again later.',
        TIMEOUT: 'The request timed out. Please try again.',
        RATE_LIMITED: 'Too many requests. Please wait a moment and try again.',
        PERMISSION_DENIED: 'You don\'t have permission to use this command.',
        NO_UNDO: 'There is no recent action to undo. Actions expire after 5 minutes.',
        INVALID_USER: 'Please provide a valid Roblox username or user ID.',
        INVALID_RANK: 'Please provide a valid rank number or rank name.'
    },
    SUCCESS: {
        RANK_CHANGED: 'User rank has been updated successfully.',
        PROMOTED: 'User has been promoted successfully.',
        DEMOTED: 'User has been demoted successfully.',
        UNDONE: 'Action has been undone successfully.'
    }
};

module.exports = {
    COLORS,
    TIMEOUTS,
    CACHE_TTL,
    RATE_LIMITS,
    ROBLOX,
    DISCORD,
    ERROR_CODES,
    MESSAGES
};
