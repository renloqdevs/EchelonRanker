/**
 * Permission Utilities
 * Handles command permission checks
 */

const { PermissionFlagsBits } = require('discord.js');
const config = require('../config');
const embeds = require('./embeds');

/**
 * Check if a member has permission to use ranking commands
 * @param {GuildMember} member - Discord guild member
 * @returns {boolean}
 */
function canUseRankingCommands(member) {
    // Bot owners always have access
    if (isAdmin(member)) {
        return true;
    }

    // Check allowed roles
    if (config.permissions.allowedRoleIds.length > 0) {
        return member.roles.cache.some(role => 
            config.permissions.allowedRoleIds.includes(role.id)
        );
    }

    // Fall back to Discord's Manage Roles permission
    return member.permissions.has(PermissionFlagsBits.ManageRoles);
}

/**
 * Check if a member is an admin (can use admin commands)
 * @param {GuildMember} member - Discord guild member
 * @returns {boolean}
 */
function isAdmin(member) {
    // Server owner always has admin
    if (member.id === member.guild.ownerId) {
        return true;
    }

    // Check admin roles
    if (config.permissions.adminRoleIds.length > 0) {
        return member.roles.cache.some(role => 
            config.permissions.adminRoleIds.includes(role.id)
        );
    }

    // Fall back to Administrator permission
    return member.permissions.has(PermissionFlagsBits.Administrator);
}

/**
 * Permission check middleware for interactions
 * @param {string} type - 'ranking' or 'admin'
 * @returns {Function} Middleware function
 */
function requirePermission(type = 'ranking') {
    return async (interaction) => {
        // DMs don't have permissions - deny
        if (!interaction.guild || !interaction.member) {
            await interaction.reply({
                embeds: [embeds.error('Not Allowed', 'This command can only be used in a server.')],
                ephemeral: true
            });
            return false;
        }

        const hasPermission = type === 'admin' 
            ? isAdmin(interaction.member)
            : canUseRankingCommands(interaction.member);

        if (!hasPermission) {
            await interaction.reply({
                embeds: [embeds.error(
                    'Permission Denied',
                    type === 'admin'
                        ? 'You need administrator permissions to use this command.'
                        : 'You don\'t have permission to use ranking commands.'
                )],
                ephemeral: true
            });
            return false;
        }

        return true;
    };
}

// Cooldown tracking
const cooldowns = new Map();

/**
 * Check and apply cooldown for a user
 * @param {string} commandName - Name of the command
 * @param {string} userId - Discord user ID
 * @param {number} cooldownSeconds - Cooldown in seconds
 * @returns {number|null} Remaining seconds if on cooldown, null if not
 */
function checkCooldown(commandName, userId, cooldownSeconds = config.options.commandCooldown) {
    if (cooldownSeconds <= 0) return null;

    const key = `${commandName}-${userId}`;
    const now = Date.now();
    const expiry = cooldowns.get(key);

    if (expiry && now < expiry) {
        return Math.ceil((expiry - now) / 1000);
    }

    // Set cooldown
    cooldowns.set(key, now + (cooldownSeconds * 1000));

    // Clean up old entries periodically
    if (cooldowns.size > 1000) {
        for (const [k, v] of cooldowns.entries()) {
            if (now > v) cooldowns.delete(k);
        }
    }

    return null;
}

/**
 * Apply cooldown check to an interaction
 * @param {Interaction} interaction
 * @returns {Promise<boolean>} True if allowed, false if on cooldown
 */
async function applyCooldown(interaction) {
    const remaining = checkCooldown(interaction.commandName, interaction.user.id);

    if (remaining) {
        await interaction.reply({
            embeds: [embeds.warning(
                'Cooldown',
                `Please wait ${remaining} second${remaining !== 1 ? 's' : ''} before using this command again.`
            )],
            ephemeral: true
        });
        return false;
    }

    return true;
}

module.exports = {
    canUseRankingCommands,
    isAdmin,
    requirePermission,
    checkCooldown,
    applyCooldown
};
