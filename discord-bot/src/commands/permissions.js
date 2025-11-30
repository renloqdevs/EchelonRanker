/**
 * /permissions command - View bot's ranking permissions
 */

const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('permissions')
        .setDescription('View the bot\'s ranking permissions'),

    async execute(interaction) {
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        await interaction.deferReply();

        try {
            const result = await api.getPermissions();

            if (result.success) {
                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('🔐 Bot Permissions')
                    .setTimestamp();

                // Bot info
                if (result.bot) {
                    embed.addFields({
                        name: '🤖 Bot Account',
                        value: `**${result.bot.username}**\nRank: ${result.bot.rankName} (${result.bot.rank})`,
                        inline: false
                    });
                }

                // Can rank status
                embed.addFields({
                    name: '📊 Status',
                    value: result.permissions.canRankUsers 
                        ? '✅ Bot can rank users' 
                        : '❌ Bot cannot rank users',
                    inline: false
                });

                // Assignable roles
                if (result.permissions.assignableRoles?.length > 0) {
                    const roleList = result.permissions.assignableRoles
                        .map(r => `\`${r.rank}\` ${r.name}`)
                        .join('\n');
                    
                    embed.addFields({
                        name: `✅ Can Assign (${result.permissions.assignableRoles.length})`,
                        value: roleList.substring(0, 1024),
                        inline: false
                    });
                }

                // Limits
                if (result.limits) {
                    embed.addFields({
                        name: '⚙️ Limits',
                        value: `Min Rank: ${result.limits.minRank}\nMax Rank: ${result.limits.maxRank}\nBot Rank: ${result.limits.botRank}`,
                        inline: false
                    });
                }

                await interaction.editReply({ embeds: [embed] });
                logger.command(interaction, 'viewed permissions');
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Failed to Get Permissions', result.message || 'Unknown error')]
                });
            }

        } catch (error) {
            logger.error('Permissions command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Failed to Get Permissions', error.message)]
            });
        }
    }
};
