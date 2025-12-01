/**
 * Embed Builder Utilities
 * Creates consistent, beautiful embeds for bot responses
 */

const { EmbedBuilder } = require('discord.js');
const config = require('../config');

const COLORS = {
    primary: config.options.embedColor,
    success: 0x57F287,
    error: 0xED4245,
    warning: 0xFEE75C,
    info: 0x5865F2,
    promote: 0x57F287,
    demote: 0xED4245,
    rank: 0x5865F2
};

/**
 * Create a success embed
 */
function success(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.success)
        .setTitle(`✅ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create an error embed
 */
function error(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.error)
        .setTitle(`❌ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create a warning embed
 */
function warning(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle(`⚠️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create an info embed
 */
function info(title, description) {
    return new EmbedBuilder()
        .setColor(COLORS.info)
        .setTitle(`ℹ️ ${title}`)
        .setDescription(description)
        .setTimestamp();
}

/**
 * Create a user card embed
 */
function userCard(user) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(`👤 ${user.username}`)
        .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${user.userId}&width=150&height=150&format=png`)
        .addFields(
            { name: 'User ID', value: `\`${user.userId}\``, inline: true },
            { name: 'Current Rank', value: `${user.rankName} (${user.rank})`, inline: true },
            { name: 'In Group', value: user.inGroup ? '✅ Yes' : '❌ No', inline: true }
        )
        .setTimestamp();

    return embed;
}

/**
 * Create a rank change embed
 */
function rankChange(result, action = 'rank') {
    const actionEmoji = action === 'promote' ? '⬆️' : action === 'demote' ? '⬇️' : '🔄';
    const actionText = action === 'promote' ? 'Promoted' : action === 'demote' ? 'Demoted' : 'Ranked';
    const color = action === 'promote' ? COLORS.promote : action === 'demote' ? COLORS.demote : COLORS.rank;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${actionEmoji} User ${actionText}`)
        .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${result.userId}&width=150&height=150&format=png`)
        .addFields(
            { name: 'User', value: `${result.username || 'Unknown'}\n\`${result.userId}\``, inline: true },
            { name: 'Previous Rank', value: `${result.oldRankName}\n(${result.oldRank})`, inline: true },
            { name: 'New Rank', value: `${result.newRankName}\n(${result.newRank})`, inline: true }
        )
        .setTimestamp();

    if (!result.changed) {
        embed.setDescription('⚠️ User was already at this rank');
    }

    return embed;
}

/**
 * Create an undo embed
 */
function undo(result) {
    return new EmbedBuilder()
        .setColor(COLORS.warning)
        .setTitle('↩️ Action Undone')
        .setThumbnail(`https://www.roblox.com/headshot-thumbnail/image?userId=${result.userId}&width=150&height=150&format=png`)
        .addFields(
            { name: 'User', value: `${result.username}\n\`${result.userId}\``, inline: true },
            { name: 'Reverted From', value: result.revertedFrom, inline: true },
            { name: 'Reverted To', value: result.revertedTo, inline: true }
        )
        .setDescription(`Undid previous ${result.undoneAction} action`)
        .setTimestamp();
}

/**
 * Create a roles list embed
 */
function rolesList(roles, groupName = 'Group') {
    const assignable = roles.filter(r => r.canAssign);
    const notAssignable = roles.filter(r => !r.canAssign);

    const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle(`📋 Roles in ${groupName}`)
        .setDescription(`Total: ${roles.length} roles | Assignable: ${assignable.length}`)
        .setTimestamp();

    // Add assignable roles
    if (assignable.length > 0) {
        const roleList = assignable
            .sort((a, b) => b.rank - a.rank)
            .map(r => `\`${r.rank.toString().padStart(3)}\` ${r.name}`)
            .join('\n');
        
        embed.addFields({
            name: '✅ Assignable Roles',
            value: roleList.substring(0, 1024) || 'None',
            inline: false
        });
    }

    // Add non-assignable roles (shortened)
    if (notAssignable.length > 0) {
        const roleList = notAssignable
            .sort((a, b) => b.rank - a.rank)
            .map(r => `\`${r.rank}\` ${r.name}`)
            .join(', ');
        
        embed.addFields({
            name: '🔒 Non-Assignable',
            value: roleList.substring(0, 1024) || 'None',
            inline: false
        });
    }

    return embed;
}

/**
 * Create a stats embed
 */
function stats(data) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('📊 Echelon Statistics')
        .setTimestamp();

    if (data.bot) {
        embed.addFields({
            name: '🤖 Bot',
            value: `**${data.bot.username}**\nRank: ${data.bot.rank}`,
            inline: true
        });
    }

    if (data.group) {
        embed.addFields({
            name: '👥 Group',
            value: `Roles: ${data.group.roleCount}\nAssignable: ${data.group.assignableRoles}`,
            inline: true
        });
    }

    if (data.operations) {
        embed.addFields({
            name: '📈 Operations',
            value: `Total: ${data.operations.total || 0}\nToday: ${data.operations.today || 0}`,
            inline: true
        });
    }

    return embed;
}

/**
 * Create a health status embed
 */
function health(data, detailed = false) {
    const isHealthy = data.status === 'ok' || data.status === 'ready';
    const color = isHealthy ? COLORS.success : COLORS.error;
    const emoji = isHealthy ? '🟢' : '🔴';

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`${emoji} API Status`)
        .addFields(
            { name: 'Status', value: data.status || 'Unknown', inline: true },
            { name: 'Bot Connected', value: data.botConnected ? '✅ Yes' : '❌ No', inline: true }
        )
        .setTimestamp();

    if (data.uptime) {
        const uptime = typeof data.uptime === 'object' ? data.uptime.formatted : `${data.uptime}s`;
        embed.addFields({ name: 'Uptime', value: uptime, inline: true });
    }

    if (data.version) {
        embed.addFields({ name: 'Version', value: data.version, inline: true });
    }

    if (detailed && data.system) {
        embed.addFields({
            name: '💻 System',
            value: `Node: ${data.system.nodeVersion}\nMemory: ${data.system.memory?.heapUsed || 0}MB`,
            inline: true
        });
    }

    return embed;
}

/**
 * Create a help embed
 */
function help() {
    return new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('📖 Echelon Commands')
        .setDescription('Discord bot for managing Roblox group ranks via Echelon API')
        .addFields(
            {
                name: '🔄 Ranking Commands',
                value: [
                    '`/rank <user> <rank>` - Set user to specific rank',
                    '`/promote <user>` - Promote user by one rank',
                    '`/demote <user>` - Demote user by one rank',
                    '`/undo` - Undo last ranking action'
                ].join('\n'),
                inline: false
            },
            {
                name: '🔍 Lookup Commands',
                value: [
                    '`/lookup <user>` - Look up user\'s current rank',
                    '`/roles` - View all group roles',
                    '`/permissions` - View bot\'s ranking permissions'
                ].join('\n'),
                inline: false
            },
            {
                name: '📊 Info Commands',
                value: [
                    '`/stats` - View ranking statistics',
                    '`/health` - Check API connection status',
                    '`/help` - Show this help message'
                ].join('\n'),
                inline: false
            }
        )
        .setFooter({ text: 'User can be a username or user ID' })
        .setTimestamp();
}

/**
 * Create a batch results embed
 */
function batchResults(results, action = 'lookup') {
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    const color = failed.length === 0 ? COLORS.success : 
                  successful.length === 0 ? COLORS.error : COLORS.warning;

    const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle(`📋 Batch ${action.charAt(0).toUpperCase() + action.slice(1)} Results`)
        .setDescription(`✅ ${successful.length} successful | ❌ ${failed.length} failed`)
        .setTimestamp();

    if (successful.length > 0) {
        const successList = successful
            .slice(0, 10)
            .map(r => `• ${r.username || r.userId}: ${r.rankName || 'OK'}`)
            .join('\n');
        
        embed.addFields({
            name: '✅ Successful',
            value: successList + (successful.length > 10 ? `\n... and ${successful.length - 10} more` : ''),
            inline: false
        });
    }

    if (failed.length > 0) {
        const failList = failed
            .slice(0, 5)
            .map(r => `• ${r.username || r.userId}: ${r.error}`)
            .join('\n');
        
        embed.addFields({
            name: '❌ Failed',
            value: failList + (failed.length > 5 ? `\n... and ${failed.length - 5} more` : ''),
            inline: false
        });
    }

    return embed;
}

/**
 * Create a logs embed
 */
function logs(logsData) {
    const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('📜 Recent Activity Logs')
        .setTimestamp();

    if (!logsData.logs || logsData.logs.length === 0) {
        embed.setDescription('No recent activity');
        return embed;
    }

    const logEntries = logsData.logs
        .slice(0, 10)
        .map(log => {
            const time = new Date(log.timestamp).toLocaleTimeString();
            const action = log.action.toUpperCase();
            return `\`${time}\` **${action}** - ${log.userId || 'System'}`;
        })
        .join('\n');

    embed.setDescription(logEntries);
    embed.setFooter({ text: `Total: ${logsData.total || logsData.logs.length} entries` });

    return embed;
}

module.exports = {
    COLORS,
    success,
    error,
    warning,
    info,
    userCard,
    rankChange,
    undo,
    rolesList,
    stats,
    health,
    help,
    batchResults,
    logs
};
