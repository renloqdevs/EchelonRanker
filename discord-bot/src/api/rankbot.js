/**
 * RankBot API Client
 * Handles all communication with the ranking API
 */

const fetch = require('node-fetch');
const config = require('../config');
const logger = require('../utils/logger');

class RankBotAPI {
    constructor() {
        this.baseUrl = config.api.url.replace(/\/$/, ''); // Remove trailing slash
        this.apiKey = config.api.key;
        this.lastAction = null; // Track for undo
    }

    /**
     * Make an API request
     * @param {string} method - HTTP method
     * @param {string} endpoint - API endpoint
     * @param {Object} body - Request body (for POST/PUT)
     * @returns {Promise<Object>} API response
     */
    async request(method, endpoint, body = null) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.apiKey
            }
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(body);
        }

        logger.debug(`API ${method} ${endpoint}`, body ? JSON.stringify(body) : '');

        try {
            const response = await fetch(url, options);
            const data = await response.json();

            if (!response.ok) {
                logger.error(`API error: ${response.status}`, data);
                throw new APIError(
                    data.message || data.error || 'API request failed',
                    response.status,
                    data.errorCode || 'E_API_ERROR'
                );
            }

            logger.debug(`API response:`, JSON.stringify(data).substring(0, 200));
            return data;

        } catch (error) {
            if (error instanceof APIError) {
                throw error;
            }
            
            logger.error('API connection error:', error.message);
            throw new APIError(
                'Failed to connect to RankBot API. Is the server running?',
                0,
                'E_CONNECTION'
            );
        }
    }

    // ============================================
    // HEALTH & STATUS
    // ============================================

    /**
     * Check API health
     */
    async health() {
        return this.request('GET', '/health');
    }

    /**
     * Check API readiness
     */
    async ready() {
        return this.request('GET', '/ready');
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
        // Check if it's a numeric ID
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
     */
    async setRank(userId, rank) {
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
                timestamp: Date.now()
            };
        }

        return result;
    }

    /**
     * Set a user's rank by username
     * @param {string} username - Roblox username
     * @param {number|string} rank - Rank number or rank name
     */
    async setRankByUsername(username, rank) {
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
                timestamp: Date.now()
            };
        }

        return result;
    }

    /**
     * Promote a user by user ID
     * @param {number} userId - Roblox user ID
     */
    async promote(userId) {
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
                timestamp: Date.now()
            };
        }

        return result;
    }

    /**
     * Promote a user by username
     * @param {string} username - Roblox username
     */
    async promoteByUsername(username) {
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
                timestamp: Date.now()
            };
        }

        return result;
    }

    /**
     * Demote a user by user ID
     * @param {number} userId - Roblox user ID
     */
    async demote(userId) {
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
                timestamp: Date.now()
            };
        }

        return result;
    }

    /**
     * Demote a user by username
     * @param {string} username - Roblox username
     */
    async demoteByUsername(username) {
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
                timestamp: Date.now()
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
    // GROUP & ROLE OPERATIONS
    // ============================================

    /**
     * Get all roles in the group
     */
    async getRoles() {
        return this.request('GET', '/api/roles');
    }

    /**
     * Get group information
     */
    async getGroup() {
        return this.request('GET', '/api/group');
    }

    /**
     * Get bot permissions
     */
    async getPermissions() {
        return this.request('GET', '/api/bot/permissions');
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
}

// Export singleton instance
module.exports = new RankBotAPI();
module.exports.APIError = APIError;
