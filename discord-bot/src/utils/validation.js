/**
 * Validation Utilities
 * Validates user input before making API calls
 */

// Roblox username rules: 3-20 characters, alphanumeric + underscore
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

// Roblox user ID: positive integer, reasonable range
const MAX_USER_ID = 10000000000; // 10 billion

// Rank range
const MIN_RANK = 0;
const MAX_RANK = 255;

/**
 * Validation result object
 */
class ValidationResult {
    constructor(valid, error = null, sanitized = null) {
        this.valid = valid;
        this.error = error;
        this.sanitized = sanitized;
    }

    static success(sanitized = null) {
        return new ValidationResult(true, null, sanitized);
    }

    static failure(error) {
        return new ValidationResult(false, error, null);
    }
}

/**
 * Validate a Roblox username
 * @param {string} username - Username to validate
 * @returns {ValidationResult}
 */
function validateUsername(username) {
    if (!username || typeof username !== 'string') {
        return ValidationResult.failure('Username is required');
    }

    const trimmed = username.trim();

    if (trimmed.length < 3) {
        return ValidationResult.failure('Username must be at least 3 characters');
    }

    if (trimmed.length > 20) {
        return ValidationResult.failure('Username cannot exceed 20 characters');
    }

    if (!USERNAME_REGEX.test(trimmed)) {
        return ValidationResult.failure('Username can only contain letters, numbers, and underscores');
    }

    return ValidationResult.success(trimmed);
}

/**
 * Validate a Roblox user ID
 * @param {string|number} userId - User ID to validate
 * @returns {ValidationResult}
 */
function validateUserId(userId) {
    if (userId === undefined || userId === null || userId === '') {
        return ValidationResult.failure('User ID is required');
    }

    const parsed = parseInt(userId, 10);

    if (isNaN(parsed)) {
        return ValidationResult.failure('User ID must be a number');
    }

    if (parsed <= 0) {
        return ValidationResult.failure('User ID must be a positive number');
    }

    if (parsed > MAX_USER_ID) {
        return ValidationResult.failure('User ID is invalid');
    }

    return ValidationResult.success(parsed);
}

/**
 * Validate a user identifier (can be username or ID)
 * @param {string} identifier - Username or user ID
 * @returns {ValidationResult}
 */
function validateUserIdentifier(identifier) {
    if (!identifier || typeof identifier !== 'string') {
        return ValidationResult.failure('Username or user ID is required');
    }

    const trimmed = identifier.trim();

    if (trimmed.length === 0) {
        return ValidationResult.failure('Username or user ID is required');
    }

    // Check if it's a numeric ID
    if (/^\d+$/.test(trimmed)) {
        const idResult = validateUserId(trimmed);
        if (idResult.valid) {
            return ValidationResult.success({ type: 'id', value: idResult.sanitized });
        }
        return idResult;
    }

    // Treat as username
    const usernameResult = validateUsername(trimmed);
    if (usernameResult.valid) {
        return ValidationResult.success({ type: 'username', value: usernameResult.sanitized });
    }
    return usernameResult;
}

/**
 * Validate a rank number
 * @param {string|number} rank - Rank to validate
 * @returns {ValidationResult}
 */
function validateRankNumber(rank) {
    if (rank === undefined || rank === null || rank === '') {
        return ValidationResult.failure('Rank is required');
    }

    const parsed = parseInt(rank, 10);

    if (isNaN(parsed)) {
        return ValidationResult.failure('Rank must be a number');
    }

    if (parsed < MIN_RANK || parsed > MAX_RANK) {
        return ValidationResult.failure(`Rank must be between ${MIN_RANK} and ${MAX_RANK}`);
    }

    return ValidationResult.success(parsed);
}

/**
 * Validate a rank (can be number or name)
 * @param {string} rank - Rank number or name
 * @returns {ValidationResult}
 */
function validateRank(rank) {
    if (!rank || (typeof rank !== 'string' && typeof rank !== 'number')) {
        return ValidationResult.failure('Rank is required');
    }

    const str = String(rank).trim();

    if (str.length === 0) {
        return ValidationResult.failure('Rank is required');
    }

    // Check if it's a number
    if (/^\d+$/.test(str)) {
        const numResult = validateRankNumber(str);
        if (numResult.valid) {
            return ValidationResult.success({ type: 'number', value: numResult.sanitized });
        }
        return numResult;
    }

    // Treat as rank name - just basic validation
    if (str.length > 100) {
        return ValidationResult.failure('Rank name is too long');
    }

    return ValidationResult.success({ type: 'name', value: str });
}

/**
 * Validate a comma-separated list of users
 * @param {string} input - Comma-separated usernames or IDs
 * @param {number} maxItems - Maximum allowed items
 * @returns {ValidationResult}
 */
function validateUserList(input, maxItems = 10) {
    if (!input || typeof input !== 'string') {
        return ValidationResult.failure('User list is required');
    }

    const items = input.split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);

    if (items.length === 0) {
        return ValidationResult.failure('At least one user is required');
    }

    if (items.length > maxItems) {
        return ValidationResult.failure(`Maximum ${maxItems} users allowed`);
    }

    const validated = [];
    const errors = [];

    for (let i = 0; i < items.length; i++) {
        const result = validateUserIdentifier(items[i]);
        if (result.valid) {
            validated.push(result.sanitized);
        } else {
            errors.push(`"${items[i]}": ${result.error}`);
        }
    }

    if (errors.length > 0) {
        return ValidationResult.failure(`Invalid entries:\n${errors.join('\n')}`);
    }

    return ValidationResult.success(validated);
}

/**
 * Format validation error for display
 * @param {ValidationResult} result - Validation result
 * @returns {string} Formatted error message
 */
function formatError(result) {
    if (result.valid) return '';
    return `**Validation Error:** ${result.error}`;
}

/**
 * Quick validation check - throws if invalid
 * @param {ValidationResult} result - Validation result
 * @param {string} fieldName - Name of the field for error message
 */
function assertValid(result, fieldName = 'Input') {
    if (!result.valid) {
        throw new Error(`${fieldName}: ${result.error}`);
    }
}

module.exports = {
    ValidationResult,
    validateUsername,
    validateUserId,
    validateUserIdentifier,
    validateRankNumber,
    validateRank,
    validateUserList,
    formatError,
    assertValid,
    // Constants
    USERNAME_REGEX,
    MAX_USER_ID,
    MIN_RANK,
    MAX_RANK
};
