/**
 * RankBot API Client
 * Handles all communication with the ranking API
 * 
 * Features:
 * - Request caching for roles and group info
 * - Retry logic with exponential backoff
 * - Request timeout handling
 * - Connection health monitoring
 */

const fetch = require('node-fetch');
const config = require('../config');
const logger = require('../utils/logger');

// ============================================
// CONSTANTS
// ============================================

const CACHE_TTL = {
    ROLES: 5 * 60 * 1000,      // 5 minutes
    GROUP: 10 * 60 * 1000,     // 10 minutes
    PERMISSIONS: 5 * 60 * 1000, // 5 minutes
    HEALTH: 30 * 1000          // 30 seconds
};

const RETRY_CONFIG = {
    MAX_RETRIES: 3,
    BASE_DELAY: 1000,          // 1 second
    MAX_DELAY: 10000,          // 10 seconds
    RETRYABLE_CODES: [408, 429, 500, 502, 503, 504]
};

const REQUEST_TIMEOUT = 15000; // 15 seconds

// ============================================
// CACHE IMPLEMENTATION
// ============================================

class Cache {
    constructor() {
        this.store = new Map();
    }

    get(key) {
        const entry = this.store.get(key);
        if (!entry) return null;
        
        if (Date.now() > entry.expiry) {
            this.store.delete(key);
            return null;
        }
        
        return entry.data;
    }

    set(key, data, ttl) {
        this.store.set(key, {
            data,
            expiry: Date.now() + ttl
        });
    }

    delete(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }

    // Get cache stats for debugging
    stats() {
        let valid = 0;
        let expired = 0;
        const now = Date.now();
        
        for (const [key, entry] of this.store.entries()) {
            if (now > entry.expiry) {
                expired++;
            } else {
                valid++;
            }
        }
        
        return { valid, expired, total: this.store.size };
    }
}

// ============================================
// API CLIENT
// ============================================

class RankBotAPI {
    constructor() {
        this.baseUrl = config.api.url.replace(/\/$/, '');
        this.apiKey = config.api.key;
        this.lastAction = null;
        this.cache = new Cache();
        this.isHealthy = true;
        this.lastHealthCheck = 0;
    }

    /**
     * Sleep for specified milliseconds
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Calculate retry delay with exponential backoff and jitter
     */
    getRetryDelay(attempt) {
        const exponentialDelay = RETRY_CONFIG.BASE_DELAY * Math.pow(2, attempt);
        const jitter = Math.random() * 1000;
        return Math.min(exponentialDelay + jitter, RETRY_CONFIG.MAX_DELAY);
    }

    /**
     * Make an API request with retry logic and timeout
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} body - Request body (for POST/PUT)
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} API response
     */
    async request(method, endpoint, body = null, options = {}) {
        const { 
            retries = RETRY_CONFIG.MAX_RETRIES,
            timeout = REQUEST_TIMEOUT,
            skipCache = false
        } = options;

        const url = `${this.baseUrl}${endpoint}`;
        
        const fetchOptions = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey,
                'User-Agent': 'RankBot-Discord/1.0'
            },
            timeout
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            fetchOptions.body = JSON.stringify(body);
        }

        let lastError;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = this.getRetryDelay(attempt - 1);
                    logger.debug(`Retry attempt ${attempt}/${retries} after ${delay}ms`);
                    await this.sleep(delay);
                }

                logger.debug(`API ${method} ${endpoint}`, body ? JSON.stringify(body) : '');

                // Create abort controller for timeout
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                fetchOptions.signal = controller.signal;

                const response = await fetch(url, fetchOptions);
                clearTimeout(timeoutId);

                const data = await response.json();

                if (!response.ok) {
                    // Check if we should retry
                    if (RETRY_CONFIG.RETRYABLE_CODES.includes(response.status) && attempt < retries) {
                        logger.warn(`Retryable error ${response.status}, will retry`);
                        lastError = new APIError(
                            data.message || data.error || 'API request failed',
                            response.status,
                            data.errorCode || 'E_API_ERROR'
                        );
                        continue;
                    }

                    logger.error(`API error: ${response.status}`, data);
                    throw new APIError(
                        data.message || data.error || 'API request failed',
                        response.status,
                        data.errorCode || 'E_API_ERROR'
                    );
                }

                // Mark as healthy on success
                this.isHealthy = true;
                
                logger.debug(`API response:`, JSON.stringify(data).substring(0, 200));
                return data;

            } catch (error) {
                if (error.name === 'AbortError') {
                    lastError = new APIError('Request timed out', 408, 'E_TIMEOUT');
                } else if (error instanceof APIError) {
                    lastError = error;
                } else {
                    lastError = new APIError(
                        'Failed to connect to RankBot API. Is the server running?',
                        0,
                        'E_CONNECTION'
                    );
                    this.isHealthy = false;
                }

                if (attempt < retries && !(error instanceof APIError && !RETRY_CONFIG.RETRYABLE_CODES.includes(error.status))) {
                    continue;
                }

                logger.error('API request failed:', lastError.message);
                throw lastError;
            }
        }

        throw lastError;
    }

    // ============================================
    // HEALTH & STATUS (with caching)
    // ============================================

    /**
     * Check API health (cached)
     */
    async health(forceRefresh = false) {
        const cacheKey = 'health';
        
        if (!forceRefresh) {
            const cached = this.cache.get(cacheKey);
            if (cached) return cached;
        }

        const result = await this.request('GET', '/health', null, { retries: 1, timeout: 5000 });
        this.cache.set(cacheKey, result, CACHE_TTL.HEALTH);
        this.isHealthy = result.status === 'ok';
        this.lastHealthCheck = Date.now();
        
        return result;
    }

    /**
     * Check API readiness
     */
    async ready() {
        return this.request('GET', '/ready', null, { retries: 1, timeout: 5000 });
    }

    /**
     * Get detailed health info
     */
    async healthDetailed() {
        return this.request('GET', '/health/detailed');
    }

    /**
     * Get API metrics
     */
    async metrics() {
        return this.request('GET', '/api/metrics');
    }

    /**
     * Get API stats
     */
    async stats() {
        return this.request('GET', '/api/stats');
    }

    /**
     * Check if API is currently healthy
     */
    isAPIHealthy() {
        return this.isHealthy;
    }

    // ============================================
    // USER OPERATIONS
    // ============================================

    /**
     * Look up a user by username
     * @param {string} username - Roblox username
     */
    async lookupByUsername(username) {
        return this.request('GET', `/api/user/${encodeURIComponent(username)}`);
    }

    /**
     * Look up a user by ID
     * @param {number} userId - Roblox user ID
     */
    async lookupById(userId) {
        return this.request('GET', `/api/rank/${userId}`);
    }

    /**
     * Look up a user (auto-detect ID vs username)
     * @param {string} identifier - Username or user ID
     */
    async lookup(identifier) {
        if (/^\d+$/.test(identifier)) {
            return this.lookupById(parseInt(identifier));
        }
        return this.lookupByUsername(identifier);
    }

    /**
     * Batch lookup by user IDs
     * @param {number[]} ids - Array of user IDs
     */
    async batchLookupByIds(ids) {
        return this.request('GET', `/api/users/batch?ids=${ids.join(',')}`);
    }

    /**
     * Batch lookup by usernames
     * @param {string[]} usernames - Array of usernames
     */
    async batchLookupByUsernames(usernames) {
        return this.request('GET', `/api/users/batch/usernames?usernames=${usernames.join(',')}`);
    }

    // ============================================
    // RANKING OPERATIONS
    // ============================================

    /**
     * Set a user's rank by user ID
     * @param {number} userId - Roblox user ID
     * @param {number|string} rank - Rank number or rank name
     * @param {Object} metadata - Optional metadata (Discord user info)
     */
    async setRank(userId, rank, metadata = {}) {
        const body = { userId: parseInt(userId) };
        
        if (typeof rank === 'number' || /^\d+$/.test(rank)) {
            body.rank = parseInt(rank);
        } else {
            body.rankName = rank;
        }

        const result = await this.request('POST', '/api/rank', body);
        
        if (result.success && result.changed) {
            this.lastAction = {
                type: 'rank',
                userId: parseInt(userId),
                username: result.username,
                oldRank: result.oldRank,
                oldRankName: result.oldRankName,
                newRank: result.newRank,
                newRankName: result.newRankName,
                timestamp: Date.now(),
                ...metadata
            };
        }

        return result;
    }

    /**
     * Set a user's rank by username
     * @param {string} username - Roblox username
     * @param {number|string} rank - Rank number or rank name
     * @param {Object} metadata - Optional metadata (Discord user info)
     */
    async setRankByUsername(username, rank, metadata = {}) {
        const body = { username };
        
        if (typeof rank === 'number' || /^\d+$/.test(rank)) {
            body.rank = parseInt(rank);
        } else {
            body.rankName = rank;
        }

        const result = await this.request('POST', '/api/rank/username', body);
        
        if (result.success && result.changed) {
            this.lastAction = {
                type: 'rank',
                userId: result.userId,
                username: username,
                oldRank: result.oldRank,
                oldRankName: result.oldRankName,
                newRank: result.newRank,
                newRankName: result.newRankName,
                timestamp: Date.now(),
                ...metadata
            };
        }

        return result;
    }

    /**
     * Promote a user by user ID
     * @param {number} userId - Roblox user ID
     * @param {Object} metadata - Optional metadata
     */
    async promote(userId, metadata = {}) {
        const result = await this.request('POST', '/api/promote', { userId: parseInt(userId) });
        
        if (result.success && result.changed) {
            this.lastAction = {
                type: 'promote',
                userId: parseInt(userId),
                username: result.username,
                oldRank: result.oldRank,
                oldRankName: result.oldRankName,
                newRank: result.newRank,
                newRankName: result.newRankName,
                timestamp: Date.now(),
                ...metadata
            };
        }

        return result;
    }

    /**
     * Promote a user by username
     * @param {string} username - Roblox username
     * @param {Object} metadata - Optional metadata
     */
    async promoteByUsername(username, metadata = {}) {
        const result = await this.request('POST', '/api/promote/username', { username });
        
        if (result.success && result.changed) {
            this.lastAction = {
                type: 'promote',
                userId: result.userId,
                username: username,
                oldRank: result.oldRank,
                oldRankName: result.oldRankName,
                newRank: result.newRank,
                newRankName: result.newRankName,
                timestamp: Date.now(),
                ...metadata
            };
        }

        return result;
    }

    /**
     * Demote a user by user ID
     * @param {number} userId - Roblox user ID
     * @param {Object} metadata - Optional metadata
     */
    async demote(userId, metadata = {}) {
        const result = await this.request('POST', '/api/demote', { userId: parseInt(userId) });
        
        if (result.success && result.changed) {
            this.lastAction = {
                type: 'demote',
                userId: parseInt(userId),
                username: result.username,
                oldRank: result.oldRank,
                oldRankName: result.oldRankName,
                newRank: result.newRank,
                newRankName: result.newRankName,
                timestamp: Date.now(),
                ...metadata
            };
        }

        return result;
    }

    /**
     * Demote a user by username
     * @param {string} username - Roblox username
     * @param {Object} metadata - Optional metadata
     */
    async demoteByUsername(username, metadata = {}) {
        const result = await this.request('POST', '/api/demote/username', { username });
        
        if (result.success && result.changed) {
            this.lastAction = {
                type: 'demote',
                userId: result.userId,
                username: username,
                oldRank: result.oldRank,
                oldRankName: result.oldRankName,
                newRank: result.newRank,
                newRankName: result.newRankName,
                timestamp: Date.now(),
                ...metadata
            };
        }

        return result;
    }

    /**
     * Bulk rank multiple users
     * @param {Array} users - Array of { userId/username, rank/rankName }
     */
    async bulkRank(users) {
        return this.request('POST', '/api/rank/bulk', { users });
    }

    // ============================================
    // GROUP & ROLE OPERATIONS (with caching)
    // ============================================

    /**
     * Get all roles in the group (cached)
     * @param {boolean} forceRefresh - Skip cache
     */
    async getRoles(forceRefresh = false) {
        const cacheKey = 'roles';
        
        if (!forceRefresh) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                logger.debug('Returning cached roles');
                return cached;
            }
        }

        const result = await this.request('GET', '/api/roles');
        this.cache.set(cacheKey, result, CACHE_TTL.ROLES);
        
        return result;
    }

    /**
     * Get assignable roles (cached, filtered)
     */
    async getAssignableRoles(forceRefresh = false) {
        const result = await this.getRoles(forceRefresh);
        return {
            ...result,
            roles: result.roles.filter(r => r.canAssign)
        };
    }

    /**
     * Get group information (cached)
     * @param {boolean} forceRefresh - Skip cache
     */
    async getGroup(forceRefresh = false) {
        const cacheKey = 'group';
        
        if (!forceRefresh) {
            const cached = this.cache.get(cacheKey);
            if (cached) {
                logger.debug('Returning cached group info');
                return cached;
            }
        }

        const result = await this.request('GET', '/api/group');
        this.cache.set(cacheKey, result, CACHE_TTL.GROUP);
        
        return result;
    }

    /**
     * Get bot permissions (cached)
     * @param {boolean} forceRefresh - Skip cache
     */
    async getPermissions(forceRefresh = false) {
        const cacheKey = 'permissions';
        
        if (!forceRefresh) {
            const cached = this.cache.get(cacheKey);
            if (cached) return cached;
        }

        const result = await this.request('GET', '/api/bot/permissions');
        this.cache.set(cacheKey, result, CACHE_TTL.PERMISSIONS);
        
        return result;
    }

    /**
     * Get members of a specific role
     * @param {number} roleId - Role ID
     * @param {number} limit - Max members to return
     * @param {string} cursor - Pagination cursor
     */
    async getRoleMembers(roleId, limit = 100, cursor = '') {
        let url = `/api/roles/${roleId}/members?limit=${limit}`;
        if (cursor) url += `&cursor=${cursor}`;
        return this.request('GET', url);
    }

    /**
     * Find a role by name (case-insensitive)
     * @param {string} name - Role name to find
     */
    async findRoleByName(name) {
        const result = await this.getRoles();
        const lower = name.toLowerCase();
        return result.roles.find(r => r.name.toLowerCase() === lower);
    }

    /**
     * Invalidate all cached data
     */
    invalidateCache() {
        this.cache.clear();
        logger.debug('Cache invalidated');
    }

    // ============================================
    // LOGS
    // ============================================

    /**
     * Get audit logs
     * @param {Object} options - { action, limit, offset }
     */
    async getLogs(options = {}) {
        let url = '/api/logs?';
        if (options.action) url += `action=${options.action}&`;
        if (options.limit) url += `limit=${options.limit}&`;
        if (options.offset) url += `offset=${options.offset}&`;
        return this.request('GET', url);
    }

    // ============================================
    // UNDO
    // ============================================

    /**
     * Get the last action (for undo)
     * @returns {Object|null} Last action or null
     */
    getLastAction() {
        if (!this.lastAction) return null;
        
        // Expire after 5 minutes
        if (Date.now() - this.lastAction.timestamp > 5 * 60 * 1000) {
            this.lastAction = null;
            return null;
        }
        
        return this.lastAction;
    }

    /**
     * Undo the last action
     * @returns {Promise<Object>} Result of the undo operation
     */
    async undo() {
        const action = this.getLastAction();
        
        if (!action) {
            throw new APIError('No action to undo', 400, 'E_NO_UNDO');
        }

        // Revert to old rank
        const result = await this.setRank(action.userId, action.oldRank);
        
        // Clear last action after undo
        this.lastAction = null;
        
        return {
            ...result,
            undoneAction: action.type,
            revertedFrom: action.newRankName,
            revertedTo: action.oldRankName
        };
    }

    /**
     * Clear the last action
     */
    clearLastAction() {
        this.lastAction = null;
    }

    // ============================================
    // UTILITY
    // ============================================

    /**
     * Get cache statistics
     */
    getCacheStats() {
        return this.cache.stats();
    }
}

/**
 * Custom API Error class
 */
class APIError extends Error {
    constructor(message, status, code) {
        super(message);
        this.name = 'APIError';
        this.status = status;
        this.code = code;
    }

    /**
     * Check if this is a connection error
     */
    isConnectionError() {
        return this.code === 'E_CONNECTION' || this.code === 'E_TIMEOUT';
    }

    /**
     * Check if this is a rate limit error
     */
    isRateLimited() {
        return this.status === 429;
    }

    /**
     * Check if this is a user error (bad input)
     */
    isUserError() {
        return this.status >= 400 && this.status < 500;
    }
}

// Export singleton instance
module.exports = new RankBotAPI();
module.exports.APIError = APIError;
module.exports.CACHE_TTL = CACHE_TTL;
