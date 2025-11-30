/**
 * Audit Log Service - Tracks all ranking operations
 * Includes memory-efficient log management with optional persistent storage
 */

const fs = require('fs');
const path = require('path');

class AuditLog {
    constructor() {
        this.logs = [];
        this.maxEntries = parseInt(process.env.AUDIT_LOG_MAX_ENTRIES) || 100;
        this.cleanupInterval = null;
        this.persistentLogging = process.env.AUDIT_LOG_FILE === 'true';
        this.logFilePath = process.env.AUDIT_LOG_PATH || path.join(process.cwd(), 'logs', 'audit.log');
        this.maxFileSize = parseInt(process.env.AUDIT_LOG_MAX_SIZE_MB) || 10; // MB
        
        // Initialize persistent logging if enabled
        if (this.persistentLogging) {
            this.initPersistentLogging();
        }
        
        // Start periodic cleanup
        this.startCleanup();
    }

    /**
     * Initialize persistent logging
     */
    initPersistentLogging() {
        try {
            const logDir = path.dirname(this.logFilePath);
            if (!fs.existsSync(logDir)) {
                fs.mkdirSync(logDir, { recursive: true, mode: 0o750 });
            }
            console.log(`\x1b[34m[AUDIT]\x1b[0m Persistent logging enabled: ${this.logFilePath}`);
        } catch (err) {
            console.error(`\x1b[31m[AUDIT]\x1b[0m Failed to initialize log directory: ${err.message}`);
            this.persistentLogging = false;
        }
    }

    /**
     * Write log entry to file
     */
    writeToFile(entry) {
        if (!this.persistentLogging) return;
        
        try {
            // Check file size and rotate if needed
            this.rotateLogIfNeeded();
            
            // Append log entry as JSON line
            const logLine = JSON.stringify(entry) + '\n';
            fs.appendFileSync(this.logFilePath, logLine, { mode: 0o640 });
        } catch (err) {
            console.error(`\x1b[31m[AUDIT]\x1b[0m Failed to write log: ${err.message}`);
        }
    }

    /**
     * Rotate log file if it exceeds max size
     */
    rotateLogIfNeeded() {
        try {
            if (!fs.existsSync(this.logFilePath)) return;
            
            const stats = fs.statSync(this.logFilePath);
            const fileSizeMB = stats.size / (1024 * 1024);
            
            if (fileSizeMB >= this.maxFileSize) {
                // Rotate: rename current log with timestamp
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const rotatedPath = this.logFilePath.replace('.log', `-${timestamp}.log`);
                fs.renameSync(this.logFilePath, rotatedPath);
                console.log(`\x1b[34m[AUDIT]\x1b[0m Log rotated: ${rotatedPath}`);
                
                // Clean up old rotated logs (keep last 5)
                this.cleanupOldLogs();
            }
        } catch (err) {
            console.error(`\x1b[31m[AUDIT]\x1b[0m Log rotation failed: ${err.message}`);
        }
    }

    /**
     * Clean up old rotated log files
     */
    cleanupOldLogs() {
        try {
            const logDir = path.dirname(this.logFilePath);
            const baseName = path.basename(this.logFilePath, '.log');
            
            const files = fs.readdirSync(logDir)
                .filter(f => f.startsWith(baseName) && f.endsWith('.log') && f !== path.basename(this.logFilePath))
                .map(f => ({ name: f, path: path.join(logDir, f), mtime: fs.statSync(path.join(logDir, f)).mtime }))
                .sort((a, b) => b.mtime - a.mtime);
            
            // Keep only the 5 most recent rotated logs
            if (files.length > 5) {
                files.slice(5).forEach(f => {
                    fs.unlinkSync(f.path);
                    console.log(`\x1b[34m[AUDIT]\x1b[0m Deleted old log: ${f.name}`);
                });
            }
        } catch (err) {
            console.error(`\x1b[31m[AUDIT]\x1b[0m Failed to cleanup old logs: ${err.message}`);
        }
    }

    /**
     * Start periodic cleanup of old entries
     */
    startCleanup() {
        // Clean up entries older than 1 hour every 10 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanup();
        }, 600000); // 10 minutes
    }

    /**
     * Stop cleanup interval
     */
    stopCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }

    /**
     * Remove entries older than 1 hour from memory
     */
    cleanup() {
        const oneHourAgo = Date.now() - 3600000;
        const beforeCount = this.logs.length;
        this.logs = this.logs.filter(log => 
            new Date(log.timestamp).getTime() > oneHourAgo
        );
        const removed = beforeCount - this.logs.length;
        if (removed > 0) {
            console.log(`\x1b[34m[AUDIT]\x1b[0m Cleaned up ${removed} old in-memory log entries`);
        }
    }

    /**
     * Add a log entry
     * @param {Object} entry - Log entry
     */
    add(entry) {
        const logEntry = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
            timestamp: new Date().toISOString(),
            action: entry.action,
            userId: entry.userId,
            username: entry.username || null,
            targetRank: entry.targetRank || null,
            oldRank: entry.oldRank || null,
            newRank: entry.newRank || null,
            success: entry.success,
            error: entry.error || null,
            ip: this.maskIp(entry.ip) // Mask IP for privacy
        };

        // Add to in-memory log
        this.logs.unshift(logEntry);

        // Efficient in-place trimming
        if (this.logs.length > this.maxEntries) {
            this.logs.length = this.maxEntries;
        }

        // Write to persistent log file
        this.writeToFile(logEntry);

        return logEntry;
    }

    /**
     * Mask IP address for privacy (GDPR compliance)
     */
    maskIp(ip) {
        if (!ip) return null;
        
        // For IPv4: mask last octet
        if (ip.includes('.') && !ip.includes(':')) {
            const parts = ip.split('.');
            if (parts.length === 4) {
                return `${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
            }
        }
        
        // For IPv6: mask last 64 bits
        if (ip.includes(':')) {
            const parts = ip.split(':');
            if (parts.length >= 4) {
                return parts.slice(0, 4).join(':') + '::xxxx';
            }
        }
        
        // Handle ::ffff:IPv4 format
        if (ip.startsWith('::ffff:')) {
            const ipv4 = ip.slice(7);
            const parts = ipv4.split('.');
            if (parts.length === 4) {
                return `::ffff:${parts[0]}.${parts[1]}.${parts[2]}.xxx`;
            }
        }
        
        return ip;
    }

    /**
     * Get all logs
     * @param {Object} options - Filter options
     */
    getAll(options = {}) {
        let filtered = [...this.logs];

        // Filter by action
        if (options.action) {
            filtered = filtered.filter(log => log.action === options.action);
        }

        // Filter by success
        if (options.success !== undefined) {
            filtered = filtered.filter(log => log.success === options.success);
        }

        // Filter by user
        if (options.userId) {
            filtered = filtered.filter(log => log.userId === options.userId);
        }

        // Pagination
        const limit = options.limit || 50;
        const offset = options.offset || 0;

        return {
            logs: filtered.slice(offset, offset + limit),
            total: filtered.length,
            limit,
            offset
        };
    }

    /**
     * Get log by ID
     */
    getById(id) {
        return this.logs.find(log => log.id === id);
    }

    /**
     * Get recent logs
     */
    getRecent(count = 10) {
        return this.logs.slice(0, count);
    }

    /**
     * Clear all logs
     */
    clear() {
        this.logs = [];
    }

    /**
     * Get statistics
     */
    getStats() {
        const stats = {
            total: this.logs.length,
            successful: this.logs.filter(l => l.success).length,
            failed: this.logs.filter(l => !l.success).length,
            byAction: {}
        };

        this.logs.forEach(log => {
            stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;
        });

        return stats;
    }
}

module.exports = new AuditLog();
