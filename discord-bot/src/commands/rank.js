/**
 * /rank command - Set a user's rank
 */

const { SlashCommandBuilder } = require('discord.js');
const api = require('../api/rankbot');
const embeds = require('../utils/embeds');
const { requirePermission, applyCooldown } = require('../utils/permissions');
const logger = require('../utils/logger');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Set a user\'s rank in the group')
        .addStringOption(option =>
            option.setName('user')
                .setDescription('Roblox username or user ID')
                .setRequired(true)
        )
        .addStringOption(option =>
            option.setName('rank')
                .setDescription('Rank number or rank name')
                .setRequired(true)
        ),

    async execute(interaction) {
        // Permission check
        if (!await requirePermission('ranking')(interaction)) return;
        
        // Cooldown check
        if (!await applyCooldown(interaction)) return;

        const user = interaction.options.getString('user');
        const rank = interaction.options.getString('rank');

        await interaction.deferReply();

        try {
            // Determine if using ID or username
            const isNumericId = /^\d+$/.test(user);
            
            let result;
            if (isNumericId) {
                result = await api.setRank(parseInt(user), rank);
            } else {
                result = await api.setRankByUsername(user, rank);
            }

            if (result.success) {
                await interaction.editReply({
                    embeds: [embeds.rankChange(result, 'rank')]
                });
                logger.command(interaction, `ranked ${result.username} to ${result.newRankName}`);
            } else {
                await interaction.editReply({
                    embeds: [embeds.error('Rank Failed', result.message || 'Unknown error')]
                });
            }

        } catch (error) {
            logger.error('Rank command error:', error.message);
            await interaction.editReply({
                embeds: [embeds.error('Rank Failed', error.message)]
            });
        }
    }
};
